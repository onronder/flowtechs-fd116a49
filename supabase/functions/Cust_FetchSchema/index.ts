import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createEdgeFunctionLogger } from "../_shared/logging.ts";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

const FUNCTION_NAME = "Cust_FetchSchema";

// Security constants
const SENSITIVE_FIELD_PATTERNS = [
  /password/i, /secret/i, /key/i, /token/i, /auth/i, /cred/i, /private/i, /access/i
];

interface SecurityMetadata {
  classification?: string;
  containsSensitiveFields?: boolean;
  sensitiveFieldCount?: number;
  accessRestrictions?: string[];
  lastSecurityScan?: string;
  securityVersion?: number;
}

// Classification levels
const CLASSIFICATION_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted'
};

// User roles
enum UserRole {
  ADMIN = 'admin',
  SCHEMA_ADMIN = 'schema_admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

// Access levels
enum AccessLevel {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public'
}

/**
 * Check if the current user has the required role
 */
async function userHasRole(supabaseClient: any, role: UserRole | UserRole[]): Promise<boolean> {
  try {
    const roles = Array.isArray(role) ? role : [role];
    
    const { data, error } = await supabaseClient
      .from("user_roles")
      .select("role")
      .in("role", roles);
      
    if (error || !data || data.length === 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

/**
 * Check if the user has access to a source
 */
async function userHasSourceAccess(supabaseClient: any, sourceId: string): Promise<boolean> {
  try {
    // First check if user is admin
    const isAdmin = await userHasRole(supabaseClient, [UserRole.ADMIN, UserRole.SCHEMA_ADMIN]);
    if (isAdmin) return true;
    
    // Check if user has direct source access
    const { data, error } = await supabaseClient
      .from("user_sources")
      .select("id")
      .eq("source_id", sourceId)
      .limit(1);
      
    return !error && data && data.length > 0;
  } catch (error) {
    console.error("Error checking source access:", error);
    return false;
  }
}

/**
 * Log schema access
 */
async function logSchemaAccess(
  supabaseClient: any, 
  schemaId: string,
  sourceId: string,
  action: 'view' | 'create' | 'update' | 'delete' | 'export',
  requestDetails: any,
  req: Request
): Promise<void> {
  try {
    // Extract request metadata
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Log the access using the security function
    await supabaseClient.rpc('log_schema_access', {
      p_schema_id: schemaId,
      p_source_id: sourceId,
      p_action: action,
      p_request_details: requestDetails,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });
  } catch (error) {
    console.error("Error logging schema access:", error);
    // Non-blocking - continue even if logging fails
  }
}

/**
 * Scan schema for sensitive information
 */
function scanSchemaForSensitiveData(schema: any): SecurityMetadata {
  try {
    // Default to internal classification
    let classification = CLASSIFICATION_LEVELS.INTERNAL;
    let sensitiveFieldCount = 0;
    const accessRestrictions = [];
    
    // Convert schema to string for pattern matching
    const schemaStr = JSON.stringify(schema);
    
    // Check for sensitive field patterns
    for (const pattern of SENSITIVE_FIELD_PATTERNS) {
      const matches = schemaStr.match(pattern);
      if (matches) {
        sensitiveFieldCount += matches.length;
        
        // If we find many sensitive fields, escalate classification
        if (sensitiveFieldCount > 5) {
          classification = CLASSIFICATION_LEVELS.CONFIDENTIAL;
          accessRestrictions.push('Requires data access approval');
        }
      }
    }
    
    // Determine if schema contains credential fields that would be restricted
    const containsCredentials = SENSITIVE_FIELD_PATTERNS.some(pattern => 
      pattern.toString().includes('key') || 
      pattern.toString().includes('token') || 
      pattern.toString().includes('secret')
    ) && schemaStr.match(/key|token|secret/i);
    
    if (containsCredentials) {
      classification = CLASSIFICATION_LEVELS.RESTRICTED;
      accessRestrictions.push('Contains credential fields');
      accessRestrictions.push('Restricted to authorized personnel only');
    }
    
    return {
      classification,
      containsSensitiveFields: sensitiveFieldCount > 0,
      sensitiveFieldCount,
      accessRestrictions: accessRestrictions.length > 0 ? accessRestrictions : undefined,
      lastSecurityScan: new Date().toISOString(),
      securityVersion: 1
    };
  } catch (error) {
    console.error("Error scanning schema for sensitive data:", error);
    return {
      classification: CLASSIFICATION_LEVELS.CONFIDENTIAL, // Default to higher security if we can't scan
      lastSecurityScan: new Date().toISOString(),
      securityVersion: 1
    };
  }
}

/**
 * Redact sensitive information from schema if needed
 */
function redactSensitiveSchemaData(schema: any, isSensitive: boolean, userHasFullAccess: boolean): any {
  // If not sensitive or user has full access, return the full schema
  if (!isSensitive || userHasFullAccess) {
    return schema;
  }
  
  try {
    // Create a deep copy to avoid modifying the original
    const redactedSchema = JSON.parse(JSON.stringify(schema));
    
    // Redact sensitive fields if schema has a specific structure
    if (redactedSchema.__schema && redactedSchema.__schema.types) {
      for (const type of redactedSchema.__schema.types) {
        if (type.fields) {
          for (const field of type.fields) {
            // Check if this field name matches sensitive patterns
            const isSensitiveField = SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(field.name));
            if (isSensitiveField) {
              // Redact the field description
              field.description = "[REDACTED - REQUIRES ELEVATED ACCESS]";
            }
          }
        }
      }
    }
    
    // For objectTypes in our common format, redact sensitive fields
    if (redactedSchema.objectTypes) {
      for (const type of redactedSchema.objectTypes) {
        if (type.fields) {
          type.fields = type.fields.filter(field => {
            return !SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(field.name));
          });
        }
      }
    }
    
    return redactedSchema;
  } catch (error) {
    console.error("Error redacting sensitive schema data:", error);
    return schema; // Return original if redaction fails
  }
}

type TypeRef = {
  kind: string;
  name?: string;
  ofType?: TypeRef;
};

type Field = {
  name: string;
  description?: string;
  type: TypeRef;
  args?: Array<{
    name: string;
    description?: string;
    type: TypeRef;
  }>;
};

type GraphQLType = {
  kind: string;
  name: string;
  description?: string;
  fields?: Field[];
};

type SchemaResponse = {
  __schema: {
    queryType: {
      name: string;
    };
    types: GraphQLType[];
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Initialize logger
  const logger = createEdgeFunctionLogger(FUNCTION_NAME, req);

  try {
    const { sourceId } = await req.json();
    logger.info(`Processing schema fetch request for source ${sourceId}`, { sourceId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Security check: Verify user has access to this source
    const hasAccess = await userHasSourceAccess(supabaseClient, sourceId);
    if (!hasAccess) {
      logger.warning(`Access denied: User does not have permission to access schema for source ${sourceId}`, 
        { sourceId }, null, { sourceId });
      return errorResponse("Access denied: You do not have permission to access this schema", 403);
    }

    // Get source details
    const { data: source, error: sourceError } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) {
      logger.error(`Failed to find source with ID ${sourceId}`, { errorMessage: sourceError.message }, sourceError, { sourceId });
      return errorResponse(`Source error: ${sourceError.message}`, 400);
    }

    // Check if user is admin or schema admin (has full access)
    const hasFullAccess = await userHasRole(supabaseClient, [UserRole.ADMIN, UserRole.SCHEMA_ADMIN]);
    
    // For non-Shopify sources, we'll use the appropriate source processor
    // but for now, we'll focus on implementing Shopify first for compatibility
    if (source.source_type !== 'shopify' && !hasFullAccess) {
      logger.warning(`Schema fetch requested for unsupported source type: ${source.source_type}`, 
        { sourceId, sourceType: source.source_type }, 
        { sourceId }
      );
      return errorResponse("Only Shopify sources are fully supported for schema fetching", 400);
    }

    // Check if a force update was requested in the query parameters
    const urlParams = new URLSearchParams(new URL(req.url).search);
    const forceUpdate = urlParams.get('forceUpdate') === 'true';
    
    // Always check for cached schema first (even with forceUpdate)
    const { data: cachedSchema, error: cacheError } = await supabaseClient
      .from("source_schemas")
      .select("schema, processed_schema, api_version, created_at, schema_version, metadata")
      .eq("source_id", sourceId)
      .eq("api_version", source.config.api_version)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') { // Not "no rows returned" error
      logger.warning(`Error checking for cached schema: ${cacheError.message}`, { 
        sourceId, 
        errorCode: cacheError.code, 
        errorMessage: cacheError.message 
      }, { sourceId });
      // Continue execution, we'll fetch a fresh schema
    }

    // Determine the cache lifetime in days based on source metadata
    const cacheLifetimeDays = source.config.schema_cache_days || 7; // Default to 7 days
    logger.debug(`Schema cache lifetime set to ${cacheLifetimeDays} days`, { 
      sourceId, 
      cacheLifetimeDays 
    }, { sourceId });

    // Check if we can use the cached schema - schema exists, matches API version, and is within cache lifetime
    if (!forceUpdate && 
        cachedSchema?.processed_schema && 
        cachedSchema.api_version === source.config.api_version && 
        withinCacheLifetime(cachedSchema.created_at, cacheLifetimeDays)) {
      
      logger.info(`Using cached schema for source ${sourceId}`, { 
        sourceId,
        schemaSize: JSON.stringify(cachedSchema.processed_schema).length,
        apiVersion: cachedSchema.api_version,
        cacheAge: `${Math.floor((Date.now() - new Date(cachedSchema.created_at).getTime()) / (86400 * 1000))} days`,
        schemaVersion: cachedSchema.schema_version || 1
      }, { sourceId });
      
      // Update the access timestamp to track usage without fetching a new schema
      try {
        await supabaseClient
          .from("source_schemas")
          .update({ 
            last_accessed_at: new Date().toISOString(),
            metadata: {
              ...cachedSchema.metadata,
              access_count: ((cachedSchema.metadata?.access_count || 0) + 1)
            }
          })
          .eq("source_id", sourceId)
          .eq("api_version", source.config.api_version);
          
        logger.debug(`Updated schema access timestamp`, { sourceId }, { sourceId });
      } catch (updateError) {
        logger.warning(`Failed to update schema access timestamp: ${updateError.message}`, 
          { sourceId, errorMessage: updateError.message }, 
          { sourceId }
        );
        // Continue anyway, this is not critical
      }
      
      return successResponse({
        success: true,
        source: {
          id: sourceId,
          type: source.source_type
        },
        schema: cachedSchema.processed_schema,
        schemaVersion: cachedSchema.schema_version || 1,
        apiVersion: cachedSchema.api_version,
        fromCache: true,
        cacheDate: cachedSchema.created_at,
        cacheAge: Math.floor((Date.now() - new Date(cachedSchema.created_at).getTime()) / (86400 * 1000))
      });
    }

    // We need to fetch the schema from Shopify
    const shopifyConfig = source.config;
    const apiVersion = shopifyConfig.api_version;
    
    logger.info(`Fetching fresh schema for source ${sourceId}`, { 
      sourceId, 
      shopifyStore: shopifyConfig.storeName,
      apiVersion
    }, { sourceId });
    
    // Build the introspection query for GraphQL schema
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType {
            name
          }
          types {
            kind
            name
            description
            fields {
              name
              description
              args {
                name
                description
                type {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                      ofType {
                        kind
                        name
                      }
                    }
                  }
                }
              }
              type {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Execute the introspection query
    const endpoint = `https://${shopifyConfig.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyConfig.accessToken
        },
        body: JSON.stringify({ query: introspectionQuery })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Shopify API error: ${response.status} ${response.statusText}`, {
          sourceId,
          statusCode: response.status,
          responseText: errorText.substring(0, 500),
          endpoint: endpoint.replace(shopifyConfig.accessToken, '[REDACTED]')
        }, new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`), { sourceId });
        
        return errorResponse(`Failed to fetch GraphQL schema: ${response.status} - ${errorText.substring(0, 200)}`, 400);
      }

      const result = await response.json();
      if (result.errors) {
        logger.error(`GraphQL errors in schema fetch`, {
          sourceId,
          errors: result.errors,
          endpoint: endpoint.replace(shopifyConfig.accessToken, '[REDACTED]')
        }, new Error(result.errors[0].message), { sourceId });
        
        return errorResponse(`GraphQL errors: ${result.errors[0].message}`, 400);
      }

      // Process the schema into a more usable format for the frontend
      const rawSchema: SchemaResponse = result.data;
      
      logger.debug(`Processing schema for source ${sourceId}`, {
        sourceId,
        schemaSize: JSON.stringify(rawSchema).length,
        typesCount: rawSchema.__schema.types.length
      }, { sourceId });
      
      const processedSchema = await logger.withErrorLogging(
        () => processSchema(rawSchema),
        `Failed to process schema for source ${sourceId}`,
        { sourceId }
      );

      // Save schema to database with versioning and metadata
      try {
        // Get the current schema versions for this source and API version
        const { data: existingVersions, error: versionError } = await supabaseClient
          .from("source_schemas")
          .select("schema_version")
          .eq("source_id", sourceId)
          .eq("api_version", apiVersion)
          .order("schema_version", { ascending: false })
          .limit(1);
          
        // Calculate next schema version
        const currentVersion = existingVersions && existingVersions.length > 0 
          ? (existingVersions[0].schema_version || 0) 
          : 0;
        const newVersion = currentVersion + 1;
        
        // Generate a hash of the schema to detect if it's actually changed
        const schemaHash = await generateSchemaHash(rawSchema);
        
        // Check if the schema has actually changed by comparing hashes
        let schemaChanged = true;
        if (currentVersion > 0) {
          const { data: lastSchema } = await supabaseClient
            .from("source_schemas")
            .select("metadata")
            .eq("source_id", sourceId)
            .eq("api_version", apiVersion)
            .eq("schema_version", currentVersion)
            .single();
            
          if (lastSchema?.metadata?.schema_hash === schemaHash) {
            schemaChanged = false;
            logger.info(`Schema content hasn't changed despite refresh request`, { 
              sourceId, 
              apiVersion,
              schemaHash
            }, { sourceId });
          }
        }
        
        // If schema hasn't changed, just update timestamps
        if (!schemaChanged && currentVersion > 0) {
          const { error: updateError } = await supabaseClient
            .from("source_schemas")
            .update({ 
              last_validated_at: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
              metadata: {
                ...(existingVersions[0].metadata || {}),
                validation_count: ((existingVersions[0].metadata?.validation_count || 0) + 1)
              }
            })
            .eq("source_id", sourceId)
            .eq("api_version", apiVersion)
            .eq("schema_version", currentVersion);
            
          if (updateError) {
            logger.warning(`Failed to update schema timestamps: ${updateError.message}`, {
              sourceId,
              apiVersion,
              schemaVersion: currentVersion
            }, { sourceId });
          } else {
            logger.info(`Updated schema timestamps without creating new version`, {
              sourceId,
              apiVersion,
              schemaVersion: currentVersion
            }, { sourceId });
          }
        } 
        // If schema has changed, create a new version
        else {
          // Calculate processing performance metrics
          const processingStartTime = performance.now();
          const processedSchema = await logger.withErrorLogging(
            async () => {
              // Process using the appropriate schema processor based on source type
              return await processSchema(rawSchema, source.source_type);
            },
            `Failed to process schema for source ${sourceId}`,
            { sourceId }
          );
          const processingEndTime = performance.now();
          const processingTime = processingEndTime - processingStartTime;
          
          // Insert the new schema version
          // Perform security scan on schema
          const securityMetadata = scanSchemaForSensitiveData(rawSchema);
          
          // Determine if schema contains sensitive data
          const isSensitive = securityMetadata.classification === CLASSIFICATION_LEVELS.CONFIDENTIAL || 
                           securityMetadata.classification === CLASSIFICATION_LEVELS.RESTRICTED;
          
          // Get user information
          const { data: userInfo } = await supabaseClient.auth.getUser();
          const userId = userInfo?.user?.id;
          
          // Insert schema with security metadata
          const { data: insertedSchema, error: saveError } = await supabaseClient
            .from("source_schemas")
            .insert({
              source_id: sourceId,
              api_version: apiVersion,
              schema_version: newVersion,
              schema: rawSchema,
              processed_schema: processedSchema,
              created_at: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
              last_validated_at: new Date().toISOString(),
              owner_id: userId,
              created_by: userId,
              access_level: isSensitive ? AccessLevel.PRIVATE : AccessLevel.SHARED,
              is_sensitive: isSensitive,
              security_metadata: securityMetadata,
              metadata: {
                schema_hash: schemaHash,
                type_count: rawSchema.__schema?.types?.length || 0,
                processed_type_count: processedSchema?.objectTypes?.length || 0,
                root_resource_count: processedSchema?.rootResources?.length || 0,
                processing_time_ms: processingTime,
                schema_size_bytes: JSON.stringify(rawSchema).length,
                processed_schema_size_bytes: JSON.stringify(processedSchema).length,
                access_count: 1,
                validation_count: 1
              }
            })
            .select('id');

          if (saveError) {
            logger.error(`Failed to save schema to database`, {
              sourceId,
              errorCode: saveError.code,
              errorMessage: saveError.message,
              apiVersion,
              schemaVersion: newVersion
            }, saveError, { sourceId });
            // Continue anyway, we can still return the schema
          } else {
            logger.info(`Successfully saved schema to database`, { 
              sourceId, 
              apiVersion, 
              schemaVersion: newVersion,
              processingTime: `${processingTime.toFixed(2)}ms`,
              schemaHash: schemaHash.substring(0, 8)
            }, { sourceId });
          }
        }
      } catch (dbError) {
        logger.error(`Exception saving schema to database`, {
          sourceId,
          errorMessage: dbError.message
        }, dbError, { sourceId });
        // Continue anyway, we can still return the schema
      }

      // Log schema access
      if (insertedSchema && insertedSchema.length > 0) {
        await logSchemaAccess(
          supabaseClient,
          insertedSchema[0].id,
          sourceId,
          'create',
          { apiVersion, newVersion, isSensitive },
          req
        );
      }
      
      logger.info(`Successfully fetched and processed schema for source ${sourceId}`, {
        sourceId,
        typeCount: processedSchema.objectTypes.length,
        rootResourceCount: processedSchema.rootResources.length,
        isSensitive: isSensitive,
        classification: securityMetadata.classification
      }, { sourceId });
      
      // Check if we need to redact sensitive information
      const hasFullAccess = await userHasRole(supabaseClient, [UserRole.ADMIN, UserRole.SCHEMA_ADMIN]);
      const schemaToReturn = isSensitive && !hasFullAccess 
        ? redactSensitiveSchemaData(processedSchema, isSensitive, hasFullAccess)
        : processedSchema;
      
      return successResponse({
        success: true,
        source: {
          id: sourceId,
          type: source.source_type
        },
        schema: schemaToReturn,
        schemaVersion: apiVersion,
        fromCache: false,
        isSensitive: isSensitive,
        securityClassification: securityMetadata.classification,
        accessRestrictions: securityMetadata.accessRestrictions,
        hasFullAccess: hasFullAccess,
        containsRedactedContent: isSensitive && !hasFullAccess
      });
    } catch (fetchError) {
      logger.error(`Error fetching schema from Shopify`, {
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

// Helper function to check if a timestamp is within the last 24 hours
function withinCacheLifetime(timestamp: string, daysValid = 7): boolean {
  const date = new Date(timestamp);
  const now = new Date();
  const msValid = daysValid * 24 * 60 * 60 * 1000;
  return (now.getTime() - date.getTime()) < msValid;
}

/**
 * Interface for SchemaProcessor that handles different data source types
 */
interface SchemaProcessor {
  processSchema(schema: any): Promise<ProcessedSchema>;
  getSourceType(): string;
}

/**
 * Common interface for processed schema regardless of source type
 */
interface ProcessedSchema {
  rootResources: RootResource[];
  objectTypes: ObjectType[];
  metadata?: {
    sourceType: string;
    processingTimeMs?: number;
    resourceCount?: number;
    typeCount?: number;
    queryableTypes?: string[];
    [key: string]: any;
  };
}

/**
 * Common interface for root resources
 */
interface RootResource {
  name: string;
  description?: string;
  type: string;
  nodeType?: string;
  isConnection?: boolean;
  queryDepth?: number;
  isQueryable?: boolean;
}

/**
 * Common interface for object types
 */
interface ObjectType {
  name: string;
  description?: string;
  fields: FieldDefinition[];
  interfaces?: string[];
  isInput?: boolean;
  isOutput?: boolean;
}

/**
 * Common interface for field definitions
 */
interface FieldDefinition {
  name: string;
  description?: string;
  type: string;
  isList: boolean;
  isNonNull: boolean;
  category: string;
  args?: ArgumentDefinition[];
}

/**
 * Common interface for argument definitions
 */
interface ArgumentDefinition {
  name: string;
  description?: string;
  type: string;
  isRequired: boolean;
  defaultValue?: any;
}

/**
 * Factory for creating schema processors based on source type
 */
function createSchemaProcessor(sourceType: string): SchemaProcessor {
  switch (sourceType.toLowerCase()) {
    case 'shopify':
      return new ShopifySchemaProcessor();
    case 'woocommerce':
      return new WooCommerceSchemaProcessor();
    case 'graphql':
      return new GenericGraphQLProcessor();
    case 'rest':
      return new RestApiSchemaProcessor();
    default:
      // Default to a generic processor that handles basic GraphQL introspection
      return new GenericGraphQLProcessor();
  }
}

/**
 * Shopify-specific schema processor
 */
class ShopifySchemaProcessor implements SchemaProcessor {
  getSourceType(): string {
    return 'shopify';
  }
  
  async processSchema(schema: SchemaResponse): Promise<ProcessedSchema> {
    const startTime = performance.now();
    
    try {
      const queryTypeName = schema.__schema.queryType.name;
      const allTypes = schema.__schema.types;

      // Create index maps for faster lookups
      const typeMap = new Map<string, GraphQLType>();
      allTypes.forEach(type => {
        if (type.name) {
          typeMap.set(type.name, type);
        }
      });
      
      // Get the Query type
      const queryType = typeMap.get(queryTypeName);
      
      if (!queryType || !queryType.fields) {
        throw new Error("Invalid schema: Query type not found");
      }
      
      // Find all connection types (these are the main resources we can query)
      // This is specific to Shopify's pagination model
      const connectionTypes = allTypes.filter(t => 
        t.name && 
        t.name.endsWith('Connection') && 
        t.fields?.some(f => f.name === 'edges') &&
        t.fields?.some(f => f.name === 'pageInfo')
      );
      
      // Create connection type map for faster lookups
      const connectionTypeMap = new Map<string, GraphQLType>();
      connectionTypes.forEach(type => {
        if (type.name) {
          connectionTypeMap.set(type.name, type);
        }
      });
      
      // Map connection types to their root fields in the Query type
      const rootResources = queryType.fields
        .filter(field => {
          // Get the field's return type
          const typeName = getDeepTypeName(field.type);
          // Check if it's a connection type
          return connectionTypeMap.has(typeName);
        })
        .map(field => {
          const typeName = getDeepTypeName(field.type);
          const connectionType = connectionTypeMap.get(typeName);
          
          // Find the node type for this connection
          const edgesField = connectionType?.fields?.find(f => f.name === 'edges');
          const edgeTypeName = edgesField ? getDeepTypeName(edgesField.type) : null;
          
          // Get the edge type
          const edgeType = edgeTypeName 
            ? typeMap.get(edgeTypeName) 
            : null;
          
          // Find the node field in the edge type
          const nodeField = edgeType?.fields?.find(f => f.name === 'node');
          const nodeTypeName = nodeField ? getDeepTypeName(nodeField.type) : null;
          
          return {
            name: field.name,
            description: field.description,
            type: typeName,
            nodeType: nodeTypeName,
            isConnection: true,
            queryDepth: 3, // Shopify connections typically require this query depth
            isQueryable: true
          } as RootResource;
        })
        .filter(resource => resource.nodeType); // Only include resources with a node type

      // Process only relevant object types to improve performance
      // Start with the node types used in root resources
      const usedTypeNames = new Set<string>();
      
      // First add all node types from root resources
      rootResources.forEach(res => {
        if (res.nodeType) {
          usedTypeNames.add(res.nodeType);
        }
      });
      
      // Then recursively add referenced types
      const addReferencedTypes = (typeName: string) => {
        const type = typeMap.get(typeName);
        if (!type || !type.fields) return;
        
        type.fields.forEach(field => {
          const fieldTypeName = getDeepTypeName(field.type);
          if (!usedTypeNames.has(fieldTypeName)) {
            const refType = typeMap.get(fieldTypeName);
            if (refType && refType.kind === 'OBJECT') {
              usedTypeNames.add(fieldTypeName);
              addReferencedTypes(fieldTypeName);
            }
          }
        });
      };
      
      // Add all referenced types recursively
      [...usedTypeNames].forEach(typeName => {
        addReferencedTypes(typeName);
      });
      
      // Process only the object types that are used by root resources
      const objectTypes = allTypes
        .filter(type => 
          type.kind === 'OBJECT' && 
          !type.name.startsWith('__') && // Filter out introspection types
          type.fields?.length > 0 && // Only include types with fields
          (usedTypeNames.has(type.name) || // Include types used by root resources
           type.name === queryTypeName) // Always include the Query type
        )
        .map(type => {
          return {
            name: type.name,
            description: type.description,
            fields: this.processTypeFields(type, typeMap),
            isOutput: true,
            isInput: false
          } as ObjectType;
        });

      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      return {
        rootResources,
        objectTypes,
        metadata: {
          sourceType: this.getSourceType(),
          processingTimeMs: processingTime,
          resourceCount: rootResources.length,
          typeCount: objectTypes.length,
          queryableTypes: rootResources.map(r => r.nodeType).filter(Boolean) as string[]
        }
      };
    } catch (error) {
      console.error("Error processing Shopify schema:", error);
      throw error;
    }
  }
  
  /**
   * Process the fields of a type optimized for Shopify
   */
  processTypeFields(type: GraphQLType, typeMap: Map<string, GraphQLType>): FieldDefinition[] {
    if (!type.fields) return [];
    
    return type.fields.map(field => {
      const fieldType = getDeepTypeName(field.type);
      const isList = isListType(field.type);
      const isNonNull = isNonNullType(field.type);
      
      // Find the referenced type in the schema
      const referencedType = typeMap.get(fieldType);
      
      // Determine field category based on the type
      let category = 'Scalar';
      if (referencedType) {
        if (referencedType.kind === 'OBJECT') {
          category = 'Object';
        } else if (referencedType.kind === 'INTERFACE' || referencedType.kind === 'UNION') {
          category = 'Interface';
        } else if (referencedType.kind === 'ENUM') {
          category = 'Enum';
        }
      }
      
      // Process field arguments if any
      const args = field.args?.map(arg => ({
        name: arg.name,
        description: arg.description,
        type: getDeepTypeName(arg.type),
        isRequired: isNonNullType(arg.type)
      })) || [];
      
      return {
        name: field.name,
        description: field.description,
        type: fieldType,
        isList,
        isNonNull,
        category,
        args: args.length > 0 ? args : undefined
      } as FieldDefinition;
    });
  }
}

/**
 * Generic GraphQL schema processor
 */
class GenericGraphQLProcessor implements SchemaProcessor {
  getSourceType(): string {
    return 'graphql';
  }
  
  async processSchema(schema: any): Promise<ProcessedSchema> {
    const startTime = performance.now();
    
    // Basic validation
    if (!schema.__schema) {
      throw new Error("Invalid GraphQL schema: missing __schema field");
    }
    
    // Map to store GraphQL types for faster lookup
    const typeMap = new Map();
    schema.__schema.types.forEach((type: any) => {
      if (type.name) {
        typeMap.set(type.name, type);
      }
    });
    
    // Find root query type
    const queryTypeName = schema.__schema.queryType?.name;
    if (!queryTypeName) {
      throw new Error("Invalid GraphQL schema: missing query type");
    }
    
    const queryType = typeMap.get(queryTypeName);
    if (!queryType || !queryType.fields) {
      throw new Error("Invalid GraphQL schema: query type not found or has no fields");
    }
    
    // Process root resources (top-level queryable fields)
    const rootResources = queryType.fields
      .filter((field: any) => {
        // Skip fields that return complex built-in types
        const typeName = getDeepTypeName(field.type);
        return !typeName.startsWith('__');
      })
      .map((field: any) => {
        const typeName = getDeepTypeName(field.type);
        const fieldType = typeMap.get(typeName);
        const isConnection = this.isConnectionType(fieldType);
        
        // For non-connection types, they're directly queryable
        // For connection types, we need to find the node type
        let nodeType = undefined;
        let queryDepth = 1;
        
        if (isConnection) {
          // Try to find the node type through edges.node pattern
          const edgesField = fieldType?.fields?.find((f: any) => f.name === 'edges');
          if (edgesField) {
            const edgeTypeName = getDeepTypeName(edgesField.type);
            const edgeType = typeMap.get(edgeTypeName);
            
            const nodeField = edgeType?.fields?.find((f: any) => f.name === 'node');
            if (nodeField) {
              nodeType = getDeepTypeName(nodeField.type);
              queryDepth = 3; // Query depth for standard connection pattern
            }
          }
        } else {
          // For direct field types
          nodeType = typeName;
        }
        
        return {
          name: field.name,
          description: field.description,
          type: typeName,
          nodeType: nodeType,
          isConnection: isConnection,
          queryDepth: queryDepth,
          isQueryable: true
        } as RootResource;
      });
      
    // Process object types
    const objectTypes = schema.__schema.types
      .filter((type: any) => 
        type.kind === 'OBJECT' && 
        !type.name.startsWith('__') && // Filter out introspection types
        type.fields?.length > 0 // Only include types with fields
      )
      .map((type: any) => {
        return {
          name: type.name,
          description: type.description,
          fields: this.processFields(type, typeMap),
          interfaces: type.interfaces?.map((inf: any) => inf.name) || [],
          isInput: false,
          isOutput: true
        } as ObjectType;
      });
    
    // Also include input types for mutations
    const inputTypes = schema.__schema.types
      .filter((type: any) => 
        type.kind === 'INPUT_OBJECT' && 
        !type.name.startsWith('__') &&
        type.inputFields?.length > 0
      )
      .map((type: any) => {
        return {
          name: type.name,
          description: type.description,
          fields: this.processInputFields(type, typeMap),
          isInput: true,
          isOutput: false
        } as ObjectType;
      });
      
    // Combine all types
    const allObjectTypes = [...objectTypes, ...inputTypes];
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    return {
      rootResources,
      objectTypes: allObjectTypes,
      metadata: {
        sourceType: this.getSourceType(),
        processingTimeMs: processingTime,
        resourceCount: rootResources.length,
        typeCount: allObjectTypes.length,
        queryableTypes: rootResources.map(r => r.nodeType).filter(Boolean) as string[]
      }
    };
  }
  
  /**
   * Process fields of a GraphQL type
   */
  processFields(type: any, typeMap: Map<string, any>): FieldDefinition[] {
    if (!type.fields) return [];
    
    return type.fields.map((field: any) => {
      const fieldType = getDeepTypeName(field.type);
      const isList = isListType(field.type);
      const isNonNull = isNonNullType(field.type);
      
      const referencedType = typeMap.get(fieldType);
      const category = this.determineCategory(referencedType);
      
      // Process arguments if any
      const args = field.args?.map((arg: any) => ({
        name: arg.name,
        description: arg.description,
        type: getDeepTypeName(arg.type),
        isRequired: isNonNullType(arg.type),
        defaultValue: arg.defaultValue
      })) || [];
      
      return {
        name: field.name,
        description: field.description,
        type: fieldType,
        isList,
        isNonNull,
        category,
        args: args.length > 0 ? args : undefined
      } as FieldDefinition;
    });
  }
  
  /**
   * Process input fields of an input type
   */
  processInputFields(type: any, typeMap: Map<string, any>): FieldDefinition[] {
    if (!type.inputFields) return [];
    
    return type.inputFields.map((field: any) => {
      const fieldType = getDeepTypeName(field.type);
      const isList = isListType(field.type);
      const isNonNull = isNonNullType(field.type);
      
      const referencedType = typeMap.get(fieldType);
      const category = this.determineCategory(referencedType);
      
      return {
        name: field.name,
        description: field.description,
        type: fieldType,
        isList,
        isNonNull,
        category,
        defaultValue: field.defaultValue
      } as FieldDefinition;
    });
  }
  
  /**
   * Determine category of a GraphQL type
   */
  determineCategory(type: any): string {
    if (!type) return 'Scalar';
    
    switch (type.kind) {
      case 'OBJECT':
        return 'Object';
      case 'INTERFACE':
      case 'UNION':
        return 'Interface';
      case 'ENUM':
        return 'Enum';
      case 'INPUT_OBJECT':
        return 'Input';
      default:
        return 'Scalar';
    }
  }
  
  /**
   * Check if a type is a connection type (follows the Relay connection pattern)
   */
  isConnectionType(type: any): boolean {
    if (!type || !type.fields) return false;
    
    const hasEdges = type.fields.some((f: any) => f.name === 'edges');
    const hasPageInfo = type.fields.some((f: any) => f.name === 'pageInfo');
    
    return hasEdges && hasPageInfo;
  }
}

/**
 * WooCommerce schema processor (placeholder)
 */
class WooCommerceSchemaProcessor implements SchemaProcessor {
  getSourceType(): string {
    return 'woocommerce';
  }
  
  async processSchema(schema: any): Promise<ProcessedSchema> {
    // For now, we'll use the generic GraphQL processor as a fallback
    const genericProcessor = new GenericGraphQLProcessor();
    const result = await genericProcessor.processSchema(schema);
    
    // Override the source type
    if (result.metadata) {
      result.metadata.sourceType = this.getSourceType();
    }
    
    return result;
  }
}

/**
 * REST API schema processor (placeholder)
 */
class RestApiSchemaProcessor implements SchemaProcessor {
  getSourceType(): string {
    return 'rest';
  }
  
  async processSchema(schema: any): Promise<ProcessedSchema> {
    // Basic implementation for a REST API schema
    const startTime = performance.now();
    
    // A REST schema might be structured differently - here we assume
    // it's an OpenAPI schema or a custom format with endpoints
    // For simplicity, we'll create a minimal representation
    
    const rootResources: RootResource[] = [];
    const objectTypes: ObjectType[] = [];
    
    // If we have endpoints defined
    if (schema.paths) {
      // Convert REST endpoints to root resources
      Object.entries(schema.paths).forEach(([path, pathObj]: [string, any]) => {
        // Process each HTTP method (GET, POST, etc.)
        Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
          if (method === 'get' && operation) {
            const resourceName = this.getResourceNameFromPath(path);
            
            rootResources.push({
              name: resourceName,
              description: operation.summary || operation.description,
              type: 'Query',
              nodeType: operation.responses?.['200']?.schema?.type || 'Object',
              isQueryable: true,
              path,
              method
            } as RootResource);
            
            // Add response schema as object type if available
            const responseSchema = operation.responses?.['200']?.schema;
            if (responseSchema && responseSchema.properties) {
              const fields = Object.entries(responseSchema.properties).map(
                ([propName, propSchema]: [string, any]) => ({
                  name: propName,
                  description: propSchema.description,
                  type: propSchema.type || 'string',
                  isList: propSchema.type === 'array',
                  isNonNull: (responseSchema.required || []).includes(propName),
                  category: propSchema.type === 'object' ? 'Object' : 'Scalar'
                } as FieldDefinition)
              );
              
              objectTypes.push({
                name: resourceName,
                description: `Response schema for ${path}`,
                fields,
                isOutput: true
              } as ObjectType);
            }
          }
        });
      });
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    return {
      rootResources,
      objectTypes,
      metadata: {
        sourceType: this.getSourceType(),
        processingTimeMs: processingTime,
        resourceCount: rootResources.length,
        typeCount: objectTypes.length,
        queryableTypes: rootResources.map(r => r.nodeType).filter(Boolean) as string[]
      }
    };
  }
  
  /**
   * Extract a resource name from a REST API path
   */
  getResourceNameFromPath(path: string): string {
    // Basic conversion - remove leading slash and parameters
    // /products/{id} -> products
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      // Remove parameter placeholders like {id}
      return lastPart.includes('{') ? parts[parts.length - 2] : lastPart;
    }
    return 'resource';
  }
}

/**
 * Process raw introspection schema using appropriate processor
 */
async function processSchema(schema: SchemaResponse, sourceType: string = 'shopify'): Promise<ProcessedSchema> {
  const processor = createSchemaProcessor(sourceType);
  return await processor.processSchema(schema);
}

// Helper to get the deepest type name from a type reference
function getDeepTypeName(typeRef: TypeRef): string {
  if (!typeRef) return 'Unknown';
  
  if (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') {
    return typeRef.ofType ? getDeepTypeName(typeRef.ofType) : 'Unknown';
  }
  
  return typeRef.name || 'Unknown';
}

// Check if a type is a list type
function isListType(typeRef: TypeRef): boolean {
  if (!typeRef) return false;
  
  if (typeRef.kind === 'LIST') {
    return true;
  }
  
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return isListType(typeRef.ofType);
  }
  
  return false;
}

// Check if a type is non-null
function isNonNullType(typeRef: TypeRef): boolean {
  return typeRef?.kind === 'NON_NULL';
}

// Generate a hash for the schema to detect changes
async function generateSchemaHash(schema: SchemaResponse): Promise<string> {
  try {
    // Get a stable representation of the schema for hashing
    // Focus on structure (types, fields) rather than descriptions which might change more often
    const typeNames = schema.__schema.types
      .filter(t => !t.name?.startsWith('__')) // Filter out introspection types
      .map(type => {
        // For each type, include its fields and their types
        const fieldInfo = type.fields?.map(field => {
          return {
            name: field.name,
            type: getDeepTypeName(field.type)
          };
        });
        
        return {
          name: type.name,
          kind: type.kind,
          fields: fieldInfo
        };
      });
    
    // Sort the type names for consistency
    const sortedTypes = typeNames.sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
    
    // Create a string representation for hashing
    const schemaString = JSON.stringify(sortedTypes);
    
    // Create a hash using the subtle crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(schemaString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    // If anything fails, return a timestamp-based unique string
    console.error("Error generating schema hash:", error);
    return `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
}