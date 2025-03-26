import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

const COMPONENT = "schemaFetcher";

/**
 * Schema fetch options interface
 */
export interface SchemaFetchOptions {
  forceUpdate?: boolean;
  processingOptions?: Record<string, any>;
  skipSecurityChecks?: boolean;
  includeRedactedContent?: boolean;
}

/**
 * Schema security information
 */
export interface SchemaSecurityInfo {
  isSensitive?: boolean;
  classification?: string;
  accessRestrictions?: string[];
  containsRedactedContent?: boolean;
  hasFullAccess?: boolean;
  securityVersion?: number;
}

/**
 * Schema fetch response interface
 */
export interface SchemaFetchResponse {
  success: boolean;
  sourceType?: string;
  schema?: any;
  data?: any;
  fromCache?: boolean;
  error?: string;
  isSensitive?: boolean;
  securityClassification?: string;
  accessRestrictions?: string[];
  containsRedactedContent?: boolean;
  hasFullAccess?: boolean;  
  metadata?: {
    processingTimeMs?: number;
    typeCount?: number;
    resourceCount?: number;
    sourceType?: string;
    apiVersion?: string;
    [key: string]: any;
  };
  security?: SchemaSecurityInfo;
}

/**
 * Fetches the schema for a data source with unified handling for different source types
 * @param sourceId The ID of the source to fetch schema for
 * @param options Options for schema fetching (or boolean for forceUpdate for backward compatibility)
 * @returns Schema fetch response
 */
export async function fetchSourceSchema(
  sourceId: string, 
  options: SchemaFetchOptions | boolean = {}
): Promise<SchemaFetchResponse> {
  try {
    // Handle both new options object and old boolean format
    const opts: SchemaFetchOptions = typeof options === 'boolean' 
      ? { forceUpdate: options } 
      : options;
    
    const { forceUpdate = false, processingOptions = {} } = opts;
    
    logger.info(
      COMPONENT,
      `Fetching schema for source ${sourceId}`,
      { sourceId, forceUpdate }
    );
    
    // Invoke the Edge Function to fetch the schema
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { sourceId, forceUpdate, processingOptions }
    });
    
    if (error) {
      logger.error(
        COMPONENT,
        `Error fetching source schema`,
        { sourceId, errorMessage: error.message },
        new Error(error.message),
        { sourceId }
      );
      
      throw new Error(error.message || "Failed to fetch schema");
    }
    
    if (!data.success) {
      logger.error(
        COMPONENT, 
        `Schema fetch unsuccessful`, 
        { sourceId, errorMessage: data.error },
        new Error(data.error || "Schema fetch unsuccessful"),
        { sourceId }
      );
      
      throw new Error(data.error || "Schema fetch unsuccessful");
    }
    
    // Extract security information
    const securityInfo: SchemaSecurityInfo = {
      isSensitive: data?.isSensitive || false,
      classification: data?.securityClassification || 'internal',
      accessRestrictions: data?.accessRestrictions || [],
      containsRedactedContent: data?.containsRedactedContent || false,
      hasFullAccess: data?.hasFullAccess || false
    };
    
    logger.info(
      COMPONENT,
      `Schema fetched successfully`,
      { 
        sourceId, 
        sourceType: data?.sourceType,
        fromCache: !!data?.fromCache,
        typeCount: data?.schema?.objectTypes?.length || 0,
        resourceCount: data?.schema?.rootResources?.length || 0,
        sensitive: securityInfo.isSensitive,
        classification: securityInfo.classification,
        containsRedactedContent: securityInfo.containsRedactedContent
      }
    );
    
    // Add security warning if content is redacted
    if (securityInfo.containsRedactedContent) {
      logger.warning(
        COMPONENT,
        `Schema contains redacted sensitive content`,
        {
          sourceId,
          classification: securityInfo.classification,
          restrictions: securityInfo.accessRestrictions
        }
      );
    }
    
    // Return enriched data with security info
    return {
      ...data,
      security: securityInfo
    };
  } catch (error) {
    logger.error(
      COMPONENT,
      `Error in fetchSourceSchema`,
      { sourceId, errorMessage: error.message, errorName: error.name },
      error,
      { sourceId }
    );
    
    throw error;
  }
}
