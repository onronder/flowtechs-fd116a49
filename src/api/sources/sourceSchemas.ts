
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logging";

const COMPONENT = "sourceSchemas";

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

/**
 * Get the supported schema formats for a source type
 * @param sourceType The source type 
 * @returns Array of supported format identifiers
 */
export async function getSupportedSchemaFormats(sourceType: string): Promise<string[]> {
  switch (sourceType.toLowerCase()) {
    case 'shopify':
      return ['graphql', 'json'];
    case 'woocommerce':
      return ['rest', 'json'];
    case 'rest':
      return ['json', 'openapi'];
    case 'ftp':
      return ['csv', 'json', 'xml'];
    case 'graphql':
      return ['graphql', 'json'];
    default:
      return ['json'];
  }
}

/**
 * Permission information interface for schema access
 */
export interface SchemaPermissionInfo {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  isOwner: boolean;
  role?: string;
}

/**
 * Checks if the current user has appropriate permissions for a schema
 * @param schemaId Schema ID to check
 * @returns Permission information
 */
export async function checkSchemaPermissions(schemaId: string): Promise<SchemaPermissionInfo> {
  try {
    // Since the check_schema_permissions RPC is not in the typed functions,
    // we need to use a more generic approach with type assertion
    const response = await supabase.rpc(
      'check_schema_permissions' as any, 
      { p_schema_id: schemaId }
    );
    
    const { data, error } = response as unknown as { 
      data: SchemaPermissionInfo, 
      error: { message: string } | null 
    };
    
    if (error) {
      logger.error(
        COMPONENT,
        `Error checking schema permissions`,
        { schemaId, errorMessage: error.message },
        new Error(error.message) // FIX: Create a proper Error object
      );
      
      // Default to view-only if error
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canShare: false,
        isOwner: false
      };
    }
    
    return data;
  } catch (error) {
    logger.error(
      COMPONENT,
      `Exception checking schema permissions`,
      { schemaId, errorMessage: error.message },
      error,
      { schemaId }
    );
    
    // Default to view-only if exception
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canShare: false,
      isOwner: false
    };
  }
}

/**
 * Access log interface for schema audit logs
 */
export interface SchemaAccessLog {
  id: string;
  timestamp: string;
  action: string;
  user_id: string;
  ip_address: string;
  success: boolean;
  users?: { email: string };
}

/**
 * Get schema access audit logs
 * @param schemaId Schema ID to get logs for
 * @param limit Number of logs to return
 * @param offset Offset for pagination
 * @returns Audit logs
 */
export async function getSchemaAccessLogs(
  schemaId: string, 
  limit = 20, 
  offset = 0
): Promise<SchemaAccessLog[]> {
  try {
    // Since schema_access_logs is not in the type definitions,
    // we'll use a generic query approach with type assertion
    const response = await (supabase as any)
      .from('schema_access_logs')
      .select(`
        id, 
        timestamp, 
        action, 
        user_id, 
        ip_address, 
        success,
        users:user_id(email)
      `)
      .eq('schema_id', schemaId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    const { data, error } = response as unknown as {
      data: SchemaAccessLog[],
      error: { message: string } | null
    };
      
    if (error) {
      logger.error(
        COMPONENT,
        `Error fetching schema access logs`,
        { schemaId, errorMessage: error.message },
        new Error(error.message) // FIX: Create a proper Error object
      );
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error(
      COMPONENT,
      `Exception fetching schema access logs`,
      { schemaId, errorMessage: error.message },
      error
    );
    return [];
  }
}
