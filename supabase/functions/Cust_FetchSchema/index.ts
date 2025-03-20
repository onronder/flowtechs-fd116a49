
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sourceId } = await req.json();
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Source error: ${sourceError.message}` 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (source.source_type !== 'shopify') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only Shopify sources are supported for schema fetching"
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Check for cached schema
    const { data: cachedSchema } = await supabaseClient
      .from("source_schemas")
      .select("schema, processed_schema, api_version, created_at")
      .eq("source_id", sourceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Check if we have a valid processed schema that we can use
    if (cachedSchema?.processed_schema && 
        cachedSchema.api_version === source.config.api_version && 
        withinLastDay(cachedSchema.created_at)) {
      console.log("Using cached processed schema");
      return new Response(
        JSON.stringify({
          success: true,
          source: {
            id: sourceId,
            type: source.source_type
          },
          schema: cachedSchema.processed_schema,
          schemaVersion: cachedSchema.api_version,
          fromCache: true,
          cacheDate: cachedSchema.created_at
        }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // We need to fetch the schema from Shopify
    const shopifyConfig = source.config;
    const apiVersion = shopifyConfig.api_version;
    
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
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch GraphQL schema: ${response.status} - ${errorText.substring(0, 200)}`
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const result = await response.json();
    if (result.errors) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `GraphQL errors: ${result.errors[0].message}`
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Process the schema into a more usable format for the frontend
    const rawSchema: SchemaResponse = result.data;
    const processedSchema = processSchema(rawSchema);

    // Save schema to database
    const { error: saveError } = await supabaseClient
      .from("source_schemas")
      .insert({
        source_id: sourceId,
        api_version: apiVersion,
        schema: rawSchema,
        processed_schema: processedSchema
      });

    if (saveError) {
      console.error("Failed to save schema:", saveError);
      // Continue anyway, we can still return the schema
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: {
          id: sourceId,
          type: source.source_type
        },
        schema: processedSchema,
        schemaVersion: apiVersion,
        fromCache: false
      }),
      { headers: corsHeaders, status: 200 }
    );
    
  } catch (error) {
    console.error("Error in Cust_FetchSchema:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

// Helper function to check if a timestamp is within the last 24 hours
function withinLastDay(timestamp: string): boolean {
  const date = new Date(timestamp);
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return (now.getTime() - date.getTime()) < oneDayMs;
}

// Process raw introspection schema into a more usable format for the frontend
function processSchema(schema: SchemaResponse) {
  const queryTypeName = schema.__schema.queryType.name;
  const allTypes = schema.__schema.types;
  
  // Get the Query type
  const queryType = allTypes.find(t => t.name === queryTypeName);
  
  if (!queryType || !queryType.fields) {
    throw new Error("Invalid schema: Query type not found");
  }
  
  // Find all connection types (these are the main resources we can query)
  const connectionTypes = allTypes.filter(t => 
    t.name && 
    t.name.endsWith('Connection') && 
    t.fields?.some(f => f.name === 'edges') &&
    t.fields?.some(f => f.name === 'pageInfo')
  );
  
  // Map connection types to their root fields in the Query type
  const rootResources = queryType.fields
    .filter(field => {
      // Get the field's return type
      const typeName = getDeepTypeName(field.type);
      // Check if it's a connection type
      return connectionTypes.some(t => t.name === typeName);
    })
    .map(field => {
      const typeName = getDeepTypeName(field.type);
      const connectionType = connectionTypes.find(t => t.name === typeName);
      
      // Find the node type for this connection
      const edgesField = connectionType?.fields?.find(f => f.name === 'edges');
      const edgeTypeName = edgesField ? getDeepTypeName(edgesField.type) : null;
      
      // Get the edge type
      const edgeType = edgeTypeName 
        ? allTypes.find(t => t.name === edgeTypeName) 
        : null;
      
      // Find the node field in the edge type
      const nodeField = edgeType?.fields?.find(f => f.name === 'node');
      const nodeTypeName = nodeField ? getDeepTypeName(nodeField.type) : null;
      
      return {
        name: field.name,
        description: field.description,
        type: typeName,
        nodeType: nodeTypeName
      };
    })
    .filter(resource => resource.nodeType); // Only include resources with a node type

  // Process all object types
  const objectTypes = allTypes
    .filter(type => 
      type.kind === 'OBJECT' && 
      !type.name.startsWith('__') && // Filter out introspection types
      type.fields?.length > 0 // Only include types with fields
    )
    .map(type => {
      return {
        name: type.name,
        description: type.description,
        fields: processTypeFields(type, allTypes)
      };
    });

  return {
    rootResources,
    objectTypes
  };
}

// Process the fields of a type
function processTypeFields(type: GraphQLType, allTypes: GraphQLType[]) {
  if (!type.fields) return [];
  
  return type.fields.map(field => {
    const fieldType = getDeepTypeName(field.type);
    const isList = isListType(field.type);
    const isNonNull = isNonNullType(field.type);
    
    // Find the referenced type in the schema
    const referencedType = allTypes.find(t => t.name === fieldType);
    
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
    
    return {
      name: field.name,
      description: field.description,
      type: fieldType,
      isList,
      isNonNull,
      category
    };
  });
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
