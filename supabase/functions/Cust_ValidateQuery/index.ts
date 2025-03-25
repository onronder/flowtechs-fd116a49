import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";
import { createEdgeFunctionLogger } from "../_shared/logging.ts";

// GraphQL Types
type GraphQLType = {
  name: string;
  kind: string;
  fields?: Array<{
    name: string;
    type: {
      kind: string;
      name?: string;
      ofType?: any;
    };
    category?: string;
  }>;
};

// Field validation interface
interface FieldValidationResult {
  field: string;
  valid: boolean;
  error?: string;
  suggestedFix?: string;
  fieldType?: string;
}

// Query validation result
interface QueryValidationResult {
  valid: boolean;
  syntaxValid: boolean;
  fieldsValid: boolean;
  resourceValid: boolean;
  error?: string;
  resourceErrors?: string[];
  fieldErrors?: FieldValidationResult[];
  suggestion?: string;
}

// Common GraphQL errors to provide better feedback
const COMMON_ERRORS = {
  'Field does not exist': 'Check field name for typos or if it exists on this resource.',
  'Cannot query field': 'This field cannot be queried directly.',
  'Syntax Error': 'Check your GraphQL syntax.',
  'Expected Name': 'There is a syntax error in your query structure.',
};

// Mapping of Shopify error codes to helpful messages
const ERROR_CODE_MESSAGES = {
  'GRAPHQL_VALIDATION_FAILED': 'The query structure is invalid.',
  'THROTTLED': 'Too many requests to the API. Try again later.',
  'INTERNAL_SERVER_ERROR': 'Shopify API is currently experiencing issues.',
  'INVALID_QUERY': 'The query syntax is invalid.',
  'ACCESS_DENIED': 'Your API credentials do not have permission for this query.',
};

const FUNCTION_NAME = "Cust_ValidateQuery";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Initialize logger
  const logger = createEdgeFunctionLogger(FUNCTION_NAME, req);

  try {
    const { sourceId, query, resourceType, fields } = await req.json();
    
    logger.info(`Processing query validation request`, { 
      sourceId, 
      hasQuery: !!query, 
      resourceType,
      fieldCount: fields?.length 
    }, { sourceId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get source details
    const { data: source, error: sourceError } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) {
      logger.error(`Failed to find source with ID ${sourceId}`, 
        { errorMessage: sourceError.message }, 
        sourceError, 
        { sourceId }
      );
      return errorResponse(`Source error: ${sourceError.message}`, 400);
    }

    if (source.source_type !== 'shopify') {
      logger.warning(`Query validation requested for unsupported source type: ${source.source_type}`, 
        { sourceId, sourceType: source.source_type }, 
        { sourceId }
      );
      return errorResponse("Only Shopify sources are supported for custom queries", 400);
    }

    // Initialize base validation result
    let validationResult: QueryValidationResult = {
      valid: false,
      syntaxValid: false,
      fieldsValid: false,
      resourceValid: false
    };

    let graphqlQuery = query;
    let generatedQuery = false;
    
    // Get Shopify configuration
    const shopifyConfig = source.config;
    const apiVersion = shopifyConfig.api_version;
    
    // Fields and resource validation - do this first before trying the API
    let fieldValidation = null;
    let fieldsToValidate = fields || [];
    
    if (resourceType && fieldsToValidate.length > 0) {
      logger.info(`Validating fields against schema`, { 
        sourceId, 
        resourceType, 
        fieldCount: fieldsToValidate.length 
      }, { sourceId });
      
      // Validate fields against the schema
      fieldValidation = await validateFieldsAgainstSchema(
        resourceType,
        fieldsToValidate,
        supabaseClient,
        sourceId,
        apiVersion
      );
      
      // Check if the resource is valid
      validationResult.resourceValid = fieldValidation.resourceValid;
      
      if (!fieldValidation.resourceValid) {
        validationResult.error = fieldValidation.resourceError;
        validationResult.resourceErrors = [fieldValidation.resourceError];
        
        logger.warning(`Resource validation failed`, { 
          sourceId, 
          resourceType,
          error: fieldValidation.resourceError 
        }, { sourceId });
        
        // Return early with resource validation error
        return successResponse({
          success: false,
          validation: validationResult,
          fieldValidation: fieldValidation.fieldResults,
          query: graphqlQuery || "",
          generated: false
        });
      }
      
      // Check field validation results
      const invalidFields = fieldValidation.fieldResults.filter(f => !f.valid);
      validationResult.fieldsValid = invalidFields.length === 0;
      
      if (invalidFields.length > 0) {
        // At least one field is invalid
        validationResult.fieldErrors = invalidFields;
        validationResult.error = `${invalidFields.length} invalid field(s)`;
        
        logger.warning(`Field validation failed for ${invalidFields.length} fields`, { 
          sourceId, 
          resourceType,
          invalidFields: invalidFields.map(f => f.field) 
        }, { sourceId });
        
        if (fieldValidation.fieldResults.some(f => f.valid)) {
          // Some fields are valid, suggest to remove invalid fields
          validationResult.suggestion = "Remove invalid fields and try again";
        }
      }
    }

    // We have two possible ways to validate:
    // 1. If a query is provided directly, validate it
    // 2. If resourceType and fields are provided, build and validate a query

    // If no direct query but we have resourceType and fields, generate the query
    if (!graphqlQuery && resourceType && fieldsToValidate.length > 0) {
      // Only generate query with valid fields if some fields failed validation
      const fieldsToUse = fieldValidation && !validationResult.fieldsValid
        ? fieldValidation.fieldResults.filter(f => f.valid).map(f => f.field)
        : fieldsToValidate;
      
      if (fieldsToUse.length === 0) {
        // No valid fields to generate query
        logger.error(`No valid fields to generate query`, { 
          sourceId, 
          resourceType 
        }, null, { sourceId });
        
        return successResponse({
          success: false,
          validation: validationResult,
          fieldValidation: fieldValidation?.fieldResults || [],
          query: ""
        });
      }
      
      logger.info(`Generating query from resource type and fields`, { 
        sourceId, 
        resourceType, 
        validFieldCount: fieldsToUse.length 
      }, { sourceId });
      
      graphqlQuery = generateGraphQLQuery(resourceType, fieldsToUse);
      generatedQuery = true;
      
      logger.debug(`Generated query`, { 
        sourceId, 
        generatedQuery: graphqlQuery 
      }, { sourceId });
    }

    if (!graphqlQuery) {
      logger.error(`Missing query parameters`, { 
        sourceId, 
        hasQuery: !!query, 
        hasResourceType: !!resourceType, 
        hasFields: !!(fields && fields.length > 0) 
      }, null, { sourceId });
      
      return errorResponse("Either a query or resourceType and fields must be provided", 400);
    }

    // At this point we have a query (either provided or generated)
    // Perform GraphQL validation by executing against the API
    
    const endpoint = `https://${shopifyConfig.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    
    logger.info(`Validating query against Shopify API`, { 
      sourceId, 
      shopifyStore: shopifyConfig.storeName,
      apiVersion,
      generated: generatedQuery
    }, { sourceId });
    
    // Add variables with pagination for validation
    const variables = {
      first: 1,  // Just get one record for validation
      after: null
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyConfig.accessToken
        },
        body: JSON.stringify({ 
          query: graphqlQuery,
          variables 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Shopify API error during validation`, {
          sourceId,
          statusCode: response.status,
          responseText: errorText.substring(0, 500),
          endpoint: endpoint.replace(shopifyConfig.accessToken, '[REDACTED]')
        }, new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`), { sourceId });
        
        // Parse the error text for better feedback
        let parsedError = errorText;
        let errorSuggestion = "Check your API connection and credentials";
        
        try {
          // Try to parse as JSON to extract more detail
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors) {
            const { errorSummary, suggestion } = parseGraphQLErrors(errorJson.errors);
            parsedError = errorSummary;
            errorSuggestion = suggestion || errorSuggestion;
          }
        } catch (parseError) {
          // Use the raw error text if not JSON
        }
        
        validationResult.syntaxValid = false;
        validationResult.error = `HTTP Error ${response.status}: ${parsedError.substring(0, 200)}`;
        validationResult.suggestion = errorSuggestion;
        
        return successResponse({
          success: false,
          validation: validationResult,
          fieldValidation: fieldValidation?.fieldResults || [],
          query: graphqlQuery,
          generated: generatedQuery
        });
      }

      const result = await response.json();

      // Check for GraphQL errors
      if (result.errors) {
        const { errorSummary, detailedErrors, suggestion } = parseGraphQLErrors(result.errors);
        
        logger.warning(`GraphQL validation failed`, {
          sourceId,
          errorSummary,
          errorDetails: detailedErrors,
          generatedQuery
        }, { sourceId });
        
        validationResult.syntaxValid = false;
        validationResult.error = errorSummary;
        validationResult.suggestion = suggestion;
        
        return successResponse({
          success: false,
          validation: validationResult,
          fieldValidation: fieldValidation?.fieldResults || [],
          query: graphqlQuery,
          generated: generatedQuery,
          graphqlErrors: detailedErrors
        });
      }

      // If we reach here, the query is valid - syntax validation passed
      validationResult.syntaxValid = true;
      
      // The query is fully valid if both syntax and fields are valid
      // If we didn't do field validation, assume fields are valid
      if (!fieldValidation) {
        validationResult.fieldsValid = true;
        validationResult.resourceValid = true;
      }
      
      validationResult.valid = validationResult.syntaxValid && 
                              validationResult.fieldsValid && 
                              validationResult.resourceValid;
      
      logger.info(`Query validation successful`, {
        sourceId,
        generatedQuery,
        hasSampleData: !!result.data,
        resourceType,
        valid: validationResult.valid,
        syntaxValid: validationResult.syntaxValid,
        fieldsValid: validationResult.fieldsValid
      }, { sourceId });
      
      return successResponse({
        success: true,
        validation: validationResult,
        fieldValidation: fieldValidation?.fieldResults || [],
        query: graphqlQuery,
        generated: generatedQuery,
        sampleData: result.data ? result.data : null
      });
    } catch (fetchError) {
      logger.error(`Error validating query`, {
        sourceId,
        errorMessage: fetchError.message,
        endpoint: endpoint.replace(shopifyConfig.accessToken, '[REDACTED]')
      }, fetchError, { sourceId });
      
      throw fetchError; // Rethrow to be caught by outer catch block
    }
    
  } catch (error) {
    logger.error(`Unhandled error in ${FUNCTION_NAME}`, {
      errorMessage: error.message,
      errorName: error.name
    }, error);
    
    return errorResponse(error.message, 500);
  }
});

// Generate a GraphQL query from resource type and fields
function generateGraphQLQuery(resourceType: string, fields: string[]): string {
  // Build the query with pagination
  const query = `
    query Get${capitalizeFirstLetter(resourceType)}($first: Int!, $after: String) {
      ${resourceType}(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            ${fields.join('\n            ')}
          }
        }
      }
    }
  `;
  
  return query;
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Validate field names against schema
 * @param resourceType The GraphQL resource type
 * @param fields Array of field names to validate
 * @param schemaTypes Schema type definitions
 * @returns Validation results for each field
 */
async function validateFieldsAgainstSchema(
  resourceType: string,
  fields: string[],
  supabaseClient: any,
  sourceId: string,
  apiVersion: string
): Promise<{ 
  fieldResults: FieldValidationResult[],
  resourceValid: boolean,
  resourceError?: string
}> {
  try {
    // Find latest schema for this source and API version
    const { data: schemaData, error: schemaError } = await supabaseClient
      .from("source_schemas")
      .select("processed_schema")
      .eq("source_id", sourceId)
      .eq("api_version", apiVersion)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
      
    if (schemaError || !schemaData?.processed_schema) {
      return { 
        fieldResults: fields.map(field => ({
          field,
          valid: false,
          error: "Schema unavailable for validation",
        })),
        resourceValid: false,
        resourceError: "Schema not found for this source"
      };
    }
    
    const schema = schemaData.processed_schema;
    
    // First validate that the resource type is valid
    const rootResource = schema.rootResources.find(
      (r: any) => r.name === resourceType
    );
    
    if (!rootResource) {
      return {
        fieldResults: [],
        resourceValid: false,
        resourceError: `Resource '${resourceType}' not found in API schema`
      };
    }

    // Get the node type for this resource
    const nodeType = rootResource.nodeType;
    if (!nodeType) {
      return {
        fieldResults: [],
        resourceValid: false,
        resourceError: `Resource '${resourceType}' does not have a node type`
      };
    }
    
    // Find the object type in schema
    const objectType = schema.objectTypes.find(
      (t: GraphQLType) => t.name === nodeType
    );
    
    if (!objectType || !objectType.fields) {
      return {
        fieldResults: [],
        resourceValid: false,
        resourceError: `Schema definition for '${nodeType}' not found`
      };
    }
    
    // Validate each field
    const results: FieldValidationResult[] = [];
    const objectFields = objectType.fields;
    
    for (const field of fields) {
      // Handle nested fields with dots (e.g. "variants.price")
      if (field.includes(".")) {
        const nestedResult = validateNestedField(field, objectType, schema);
        results.push(nestedResult);
        continue;
      }
      
      // Find the field in the object type
      const fieldDef = objectFields.find(f => f.name === field);
      
      if (!fieldDef) {
        // Field not found, check for similar fields to suggest
        const similarFields = findSimilarFields(field, objectFields);
        let suggestion = "";
        
        if (similarFields.length > 0) {
          suggestion = `Did you mean: ${similarFields.join(", ")}?`;
        }
        
        results.push({
          field,
          valid: false,
          error: `Field '${field}' does not exist on type '${nodeType}'`,
          suggestedFix: suggestion
        });
        continue;
      }
      
      // Field exists, validate its type
      results.push({
        field,
        valid: true,
        fieldType: getFieldType(fieldDef)
      });
    }
    
    return {
      fieldResults: results,
      resourceValid: true
    };
  } catch (error) {
    console.error("Error validating fields against schema:", error);
    return {
      fieldResults: fields.map(field => ({
        field,
        valid: false,
        error: "Error during field validation"
      })),
      resourceValid: false,
      resourceError: "Error validating against schema: " + error.message
    };
  }
}

/**
 * Validate a nested field path
 */
function validateNestedField(
  nestedField: string,
  parentType: GraphQLType,
  schema: any
): FieldValidationResult {
  const parts = nestedField.split(".");
  let currentType = parentType;
  let valid = true;
  let fieldPath = "";
  let errorPath = "";
  
  // Validate each part of the path
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    fieldPath = fieldPath ? `${fieldPath}.${part}` : part;
    
    if (!currentType?.fields) {
      valid = false;
      errorPath = fieldPath;
      break;
    }
    
    const fieldDef = currentType.fields.find(f => f.name === part);
    if (!fieldDef) {
      valid = false;
      errorPath = fieldPath;
      break;
    }
    
    // If this is not the last part, we need to find the type for the next level
    if (i < parts.length - 1) {
      const typeName = getFieldTypeName(fieldDef.type);
      if (!typeName) {
        valid = false;
        errorPath = fieldPath;
        break;
      }
      
      // Find this type in the schema
      currentType = schema.objectTypes.find(
        (t: GraphQLType) => t.name === typeName
      );
      
      if (!currentType) {
        valid = false;
        errorPath = fieldPath;
        break;
      }
    }
  }
  
  if (!valid) {
    return {
      field: nestedField,
      valid: false,
      error: `Invalid nested field path: '${errorPath}'`,
      suggestedFix: "Check each part of the nested field path"
    };
  }
  
  return {
    field: nestedField,
    valid: true,
    fieldType: "nested"
  };
}

/**
 * Get the final type name from a GraphQL type definition
 */
function getFieldTypeName(typeDef: any): string | null {
  if (!typeDef) return null;
  
  if (typeDef.name) {
    return typeDef.name;
  }
  
  if (typeDef.ofType) {
    return getFieldTypeName(typeDef.ofType);
  }
  
  return null;
}

/**
 * Get a human-readable field type
 */
function getFieldType(fieldDef: any): string {
  if (!fieldDef || !fieldDef.type) return "unknown";
  
  const typeName = getFieldTypeName(fieldDef.type);
  const isList = isListType(fieldDef.type);
  
  return isList ? `[${typeName}]` : typeName || "unknown";
}

/**
 * Check if a field type is a list
 */
function isListType(typeDef: any): boolean {
  if (!typeDef) return false;
  
  if (typeDef.kind === "LIST") {
    return true;
  }
  
  if (typeDef.kind === "NON_NULL" && typeDef.ofType) {
    return isListType(typeDef.ofType);
  }
  
  return false;
}

/**
 * Find similar field names (to provide suggestions for typos)
 */
function findSimilarFields(field: string, fields: any[]): string[] {
  const lowercaseField = field.toLowerCase();
  const similarFields: string[] = [];
  
  for (const f of fields) {
    // Check if the field name is similar
    if (f.name.toLowerCase().includes(lowercaseField) || 
        lowercaseField.includes(f.name.toLowerCase())) {
      similarFields.push(f.name);
    }
  }
  
  // Return at most 3 similar fields
  return similarFields.slice(0, 3);
}

/**
 * Parse GraphQL errors and provide more helpful feedback
 */
function parseGraphQLErrors(errors: any[]): {
  errorSummary: string;
  detailedErrors: any[];
  suggestion?: string;
} {
  if (!errors || errors.length === 0) {
    return {
      errorSummary: "Unknown validation error",
      detailedErrors: []
    };
  }
  
  const firstError = errors[0];
  let errorMessage = firstError.message;
  let errorCode = firstError.extensions?.code;
  let locationInfo = "";
  
  // Add location info if available
  if (firstError.locations && firstError.locations.length > 0) {
    const loc = firstError.locations[0];
    locationInfo = ` at line ${loc.line}, column ${loc.column}`;
  }
  
  // Look for common error patterns to provide better feedback
  let suggestion = "";
  for (const [pattern, fix] of Object.entries(COMMON_ERRORS)) {
    if (errorMessage.includes(pattern)) {
      suggestion = fix;
      break;
    }
  }
  
  // Check for code-specific messages
  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
    suggestion = ERROR_CODE_MESSAGES[errorCode] + " " + (suggestion || "");
  }
  
  return {
    errorSummary: `${errorMessage}${locationInfo}`,
    detailedErrors: errors,
    suggestion: suggestion
  };
}