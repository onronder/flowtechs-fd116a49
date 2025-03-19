
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
      
    if (sourceError) throw sourceError;
    
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function fetchShopifySchema(source: any, supabaseClient: any) {
  const config = source.config;
  const shopifyEndpoint = `https://${config.storeName}.myshopify.com/admin/api/${config.api_version}/graphql.json`;
  
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
      throw new Error(result.errors[0].message);
    }
    
    // Save schema to database
    const { error: insertError } = await supabaseClient
      .from("source_schemas")
      .upsert({
        source_id: source.id,
        api_version: config.api_version,
        schema: result.data
      });
      
    if (insertError) throw insertError;
    
    // Update last_validated_at in sources table
    const { error: updateError } = await supabaseClient
      .from("sources")
      .update({ 
        last_validated_at: new Date().toISOString()
      })
      .eq("id", source.id);
      
    if (updateError) throw updateError;
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Schema fetched and cached successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Schema fetch failed: ${error.message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
