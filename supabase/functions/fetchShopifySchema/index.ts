
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  console.log("[fetchShopifySchema] Request method:", req.method);
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  try {
    const { sourceId, forceUpdate = false } = await req.json();
    console.log(`[fetchShopifySchema] Fetching schema for sourceId: ${sourceId}, forceUpdate: ${forceUpdate}`);
    
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
      console.error("[fetchShopifySchema] Error fetching source:", sourceError);
      return errorResponse(`Error fetching source: ${sourceError.message}`);
    }
    
    if (source.source_type !== "shopify") {
      console.error(`[fetchShopifySchema] Invalid source type: ${source.source_type}`);
      return errorResponse("Source is not a Shopify source");
    }
    
    const config = source.config;
    const { storeName, accessToken, api_version } = config;
    
    if (!storeName || !accessToken || !api_version) {
      console.error("[fetchShopifySchema] Missing required config parameters");
      return errorResponse("Missing required Shopify configuration");
    }
    
    console.log(`[fetchShopifySchema] Processing source: ${storeName} with API version: ${api_version}`);
    
    // Check if we need to update the schema
    if (!forceUpdate) {
      // Check if we already have a schema for this version
      const { data: existingSchema } = await supabaseClient
        .from("source_schemas")
        .select("created_at")
        .eq("source_id", sourceId)
        .eq("api_version", api_version)
        .single();
      
      if (existingSchema) {
        console.log(`[fetchShopifySchema] Schema already exists for version ${api_version}, created at ${existingSchema.created_at}`);
        return successResponse({ 
          message: "Schema already exists",
          cached: true
        });
      }
    }
    
    // Introspection query to fetch the GraphQL schema
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          types {
            kind
            name
            description
            fields {
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
          }
        }
      }
    `;
    
    const shopifyEndpoint = `https://${storeName}.myshopify.com/admin/api/${api_version}/graphql.json`;
    console.log(`[fetchShopifySchema] Making GraphQL introspection request to: ${shopifyEndpoint}`);
    
    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: introspectionQuery })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fetchShopifySchema] GraphQL error: ${response.status} ${errorText.substring(0, 200)}`);
      return errorResponse(`Schema fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("[fetchShopifySchema] GraphQL errors:", result.errors);
      return errorResponse(`GraphQL error: ${result.errors[0].message}`);
    }
    
    console.log("[fetchShopifySchema] Schema fetched successfully, saving to database");
    
    // Save schema to database
    const { error: insertError } = await supabaseClient
      .from("source_schemas")
      .upsert({
        source_id: sourceId,
        api_version: api_version,
        schema: result.data
      });
      
    if (insertError) {
      console.error("[fetchShopifySchema] Error inserting schema:", insertError);
      return errorResponse(`Schema save failed: ${insertError.message}`);
    }
    
    // Update last_validated_at in sources table
    const { error: updateError } = await supabaseClient
      .from("sources")
      .update({ 
        last_validated_at: new Date().toISOString()
      })
      .eq("id", sourceId);
      
    if (updateError) {
      console.error("[fetchShopifySchema] Error updating source validation timestamp:", updateError);
      return errorResponse(`Schema timestamp update failed: ${updateError.message}`);
    }
    
    console.log("[fetchShopifySchema] Schema stored successfully");
    
    return successResponse({
      message: "Schema fetched and cached successfully"
    });
  } catch (error) {
    console.error("[fetchShopifySchema] Unhandled error:", error);
    return errorResponse(`Server error: ${error.message}`);
  }
});
