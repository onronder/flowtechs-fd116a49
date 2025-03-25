// src/api/datasets/shopifySchemaApi.ts
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logging";

const COMPONENT = "shopifySchemaApi";

/**
 * Fetch Shopify GraphQL schema
 * @param sourceId The ID of the source to fetch the schema for
 * @param options Configuration options for the fetch
 * @returns The schema data
 */
export async function fetchShopifySchema(
  sourceId: string, 
  options: { 
    forceRefresh?: boolean; 
    maxAge?: number;
  } = {}
) {
  try {
    const { forceRefresh = false, maxAge } = options;
    
    logger.info(
      COMPONENT, 
      `Fetching schema for source ${sourceId}`, 
      { sourceId, forceRefresh, maxAge }
    );
    
    // Add query parameters to support force refresh and cache control
    let requestData = { sourceId };
    let queryParams = new URLSearchParams();
    
    if (forceRefresh) {
      queryParams.set('forceUpdate', 'true');
    }
    
    if (maxAge !== undefined) {
      queryParams.set('maxAge', maxAge.toString());
    }
    
    // Create the URL with query parameters if needed
    const url = queryParams.toString() 
      ? `Cust_FetchSchema?${queryParams.toString()}`
      : 'Cust_FetchSchema';
    
    const { data, error } = await supabase.functions.invoke(url, {
      body: requestData
    });
    
    if (error) {
      logger.error(
        COMPONENT,
        `Failed to fetch schema for source ${sourceId}`,
        { sourceId, errorMessage: error.message },
        new Error(error.message),
        { sourceId, requestData }
      );
      throw error;
    }
    
    logger.debug(
      COMPONENT,
      `Successfully fetched schema for source ${sourceId}`,
      {
        sourceId,
        schemaSize: data ? JSON.stringify(data).length : 0,
        fromCache: data?.fromCache || false,
        schemaVersion: data?.schemaVersion || 1,
        apiVersion: data?.apiVersion,
        typeCount: data?.schema?.objectTypes?.length || 0
      }
    );
    
    return data;
  } catch (error: any) {
    // Log error with full details
    logger.error(
      COMPONENT,
      `Error fetching schema for source ${sourceId}`,
      { sourceId, errorMessage: error.message, errorName: error.name },
      error,
      { sourceId }
    );
    throw error;
  }
}

/**
 * Force refresh the Shopify GraphQL schema - convenience method
 * @param sourceId The ID of the source to refresh schema for
 * @returns The refreshed schema data
 */
export async function refreshShopifySchema(sourceId: string) {
  try {
    logger.info(COMPONENT, `Force refreshing schema for source ${sourceId}`, { sourceId });
    
    return await fetchShopifySchema(sourceId, { forceRefresh: true });
  } catch (error: any) {
    logger.error(
      COMPONENT,
      `Error refreshing schema for source ${sourceId}`,
      { sourceId, errorMessage: error.message, errorName: error.name },
      error,
      { sourceId }
    );
    throw error;
  }
}

/**
 * Interface for field validation results
 */
export interface FieldValidationResult {
  field: string;
  valid: boolean;
  error?: string;
  suggestedFix?: string;
  fieldType?: string;
}

/**
 * Interface for query validation result
 */
export interface QueryValidationResult {
  valid: boolean;
  syntaxValid: boolean;
  fieldsValid: boolean;
  resourceValid: boolean;
  error?: string;
  resourceErrors?: string[];
  fieldErrors?: FieldValidationResult[];
  suggestion?: string;
}

/**
 * Response from query validation
 */
export interface ValidationResponse {
  success: boolean;
  validation: QueryValidationResult;
  fieldValidation?: FieldValidationResult[];
  query: string;
  generated: boolean;
  graphqlErrors?: any[];
  sampleData?: any;
}

/**
 * Validate custom query with enhanced error handling
 * @param sourceId The ID of the source to validate against
 * @param queryData The query data containing fields, resourceType or direct query
 * @returns Detailed validation response
 */
export async function validateCustomQuery(
  sourceId: string, 
  queryData: {
    query?: string;
    resourceType?: string;
    fields?: string[];
  }
): Promise<ValidationResponse> {
  try {
    logger.info(
      COMPONENT, 
      `Validating query for source ${sourceId}`,
      { 
        sourceId,
        resourceType: queryData.resourceType,
        hasQuery: !!queryData.query,
        fieldCount: queryData.fields?.length
      }
    );
    
    const requestData = { sourceId, ...queryData };
    const { data, error } = await supabase.functions.invoke("Cust_ValidateQuery", {
      body: requestData
    });
    
    if (error) {
      logger.error(
        COMPONENT,
        `Failed to validate query for source ${sourceId}`,
        { sourceId, errorMessage: error.message },
        new Error(error.message),
        { sourceId, requestData }
      );
      
      // Format error as a validation response
      return {
        success: false,
        validation: {
          valid: false,
          syntaxValid: false,
          fieldsValid: false,
          resourceValid: false,
          error: error.message
        },
        query: queryData.query || "",
        generated: false
      };
    }
    
    // Format success cases to ensure they always have the expected structure
    const validationResponse: ValidationResponse = {
      success: !!data.success,
      validation: data.validation || {
        valid: false,
        syntaxValid: false,
        fieldsValid: false,
        resourceValid: false,
        error: "Unknown validation error"
      },
      fieldValidation: data.fieldValidation || [],
      query: data.query || queryData.query || "",
      generated: !!data.generated,
      graphqlErrors: data.graphqlErrors || [],
      sampleData: data.sampleData || null
    };
    
    // Log detailed validation result
    if (validationResponse.validation.valid) {
      logger.info(
        COMPONENT,
        `Query validation successful for source ${sourceId}`,
        { 
          sourceId,
          isValid: true,
          syntaxValid: validationResponse.validation.syntaxValid,
          fieldsValid: validationResponse.validation.fieldsValid,
          resourceValid: validationResponse.validation.resourceValid,
          generated: validationResponse.generated,
          hasSampleData: !!validationResponse.sampleData
        }
      );
    } else {
      logger.warning(
        COMPONENT,
        `Query validation failed for source ${sourceId}`,
        { 
          sourceId,
          isValid: false,
          syntaxValid: validationResponse.validation.syntaxValid,
          fieldsValid: validationResponse.validation.fieldsValid,
          resourceValid: validationResponse.validation.resourceValid,
          validationError: validationResponse.validation.error,
          suggestion: validationResponse.validation.suggestion,
          invalidFieldCount: validationResponse.validation.fieldErrors?.length || 0,
          generated: validationResponse.generated
        }
      );
    }
    
    return validationResponse;
  } catch (error: any) {
    // Log error with full details
    logger.error(
      COMPONENT,
      `Error validating query for source ${sourceId}`,
      { sourceId, errorMessage: error.message, errorName: error.name },
      error,
      { sourceId, requestData: { sourceId, ...queryData } }
    );
    
    // Format as validation response
    return {
      success: false,
      validation: {
        valid: false,
        syntaxValid: false,
        fieldsValid: false,
        resourceValid: false,
        error: error.message
      },
      query: queryData.query || "",
      generated: false
    };
  }
}