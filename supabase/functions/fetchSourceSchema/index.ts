import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const { sourceId, forceUpdate = false } = await req.json();
    console.log(`Processing fetchSourceSchema request for sourceId: ${sourceId}, forceUpdate: ${forceUpdate}`);
    
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
      console.error("Error fetching source:", sourceError);
      throw sourceError;
    }

    console.log(`Source found: type=${source.source_type}, name=${source.name}`);
    
    // Check if we need to update the schema
    if (!forceUpdate) {
      // Check if we already have a schema for this version
      const { data: existingSchema } = await supabaseClient
        .from("source_schemas")
        .select("created_at")
        .eq("source_id", sourceId)
        .eq("api_version", source.config.api_version)
        .single();
      
      if (existingSchema) {
        console.log(`Schema already exists for version ${source.config.api_version}, created at ${existingSchema.created_at}`);
        // Schema already exists
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Schema already exists",
            cached: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Fetch schema based on source type
    switch (source.source_type) {
      case "shopify":
        return await fetchShopifySchema(source, supabaseClient);
      // Add cases for other source types
      default:
        throw new Error(`Schema fetching not implemented for source type: ${source.source_type}`);
    }
  } catch (error) {
    console.error("Error in fetchSourceSchema:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function fetchShopifySchema(source: any, supabaseClient: any) {
  const config = source.config;
  console.log(`Fetching Shopify schema for store: ${config.storeName}, API version: ${config.api_version}`);
  
  // Make sure we're using a valid API version
  let apiVersion = config.api_version;
  
  // If no API version is available, try to fetch the current one
  if (!apiVersion) {
    try {
      console.log(`No API version found, fetching current version for store: ${config.storeName}`);
      const versionEndpoint = `https://${config.storeName}.myshopify.com/admin/api/versions`;
      
      const versionResponse = await fetch(versionEndpoint, {
        headers: {
          "X-Shopify-Access-Token": config.accessToken,
          "Content-Type": "application/json"
        }
      });
      
      if (versionResponse.ok) {
        const versionData = await versionResponse.json();
        
        if (versionData.supported_versions && versionData.supported_versions.length > 0) {
          apiVersion = versionData.supported_versions[0].handle;
          console.log(`Fetched current API version: ${apiVersion}`);
          
          // Update the source with the current API version
          await supabaseClient
            .from("sources")
            .update({ 
              config: { ...config, api_version: apiVersion },
              updated_at: new Date().toISOString()
            })
            .eq("id", source.id);
        }
      }
    } catch (error) {
      console.error(`Error fetching current API version: ${error.message}`);
      // Continue with default version
      apiVersion = "2023-10"; // Fallback to a more recent version than 2023-07
    }
  }
  
  if (!apiVersion) {
    throw new Error("Could not determine Shopify API version");
  }
  
  const shopifyEndpoint = `https://${config.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
  
  // Introspection query to fetch schema
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
  
  try {
    console.log(`Making GraphQL introspection request to Shopify API: ${shopifyEndpoint}`);
    
    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.accessToken
      },
      body: JSON.stringify({ query: introspectionQuery })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      throw new Error(result.errors[0].message);
    }
    
    console.log("GraphQL schema fetched successfully, saving to database");
    
    // Save schema to database
    const { error: insertError } = await supabaseClient
      .from("source_schemas")
      .upsert({
        source_id: source.id,
        api_version: config.api_version,
        schema: result.data
      });
      
    if (insertError) {
      console.error("Error inserting schema:", insertError);
      throw insertError;
    }
    
    // Update last_validated_at in sources table
    const { error: updateError } = await supabaseClient
      .from("sources")
      .update({ 
        last_validated_at: new Date().toISOString()
      })
      .eq("id", source.id);
      
    if (updateError) {
      console.error("Error updating source validation timestamp:", updateError);
      throw updateError;
    }
    
    console.log("Schema stored successfully");
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Schema fetched and cached successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetchShopifySchema:", error);
    return new Response(
      JSON.stringify({ error: `Schema fetch failed: ${error.message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
