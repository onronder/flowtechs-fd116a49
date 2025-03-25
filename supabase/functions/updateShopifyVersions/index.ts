
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get all active Shopify sources
    const { data: sources, error: sourcesError } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("source_type", "shopify")
      .eq("is_active", true);

    if (sourcesError) {
      throw new Error(`Error fetching sources: ${sourcesError.message}`);
    }

    console.log(`Found ${sources.length} active Shopify sources to update`);
    
    // Process each source
    const results = await Promise.all(sources.map(async (source) => {
      try {
        const config = source.config;
        if (!config.storeName || !config.accessToken) {
          return {
            id: source.id,
            name: source.name,
            status: "skipped",
            reason: "Missing required credentials"
          };
        }
        
        // Fetch the latest version available
        const versionResponse = await fetch(`https://${config.storeName}.myshopify.com/admin/api/versions`, {
          headers: {
            "X-Shopify-Access-Token": config.accessToken,
            "Content-Type": "application/json"
          }
        });
        
        if (!versionResponse.ok) {
          return {
            id: source.id,
            name: source.name,
            status: "error",
            reason: `Failed to fetch versions: ${versionResponse.status}`
          };
        }
        
        const versionData = await versionResponse.json();
        if (!versionData.supported_versions || !versionData.supported_versions.length) {
          return {
            id: source.id,
            name: source.name,
            status: "error",
            reason: "No API versions found in response"
          };
        }
        
        // Sort versions to find the latest one
        const sortedVersions = [...versionData.supported_versions].sort((a, b) => {
          return b.handle.localeCompare(a.handle);
        });
        const latestVersion = sortedVersions[0].handle;
        
        // Update the source config if needed
        if (config.api_version !== latestVersion) {
          const updatedConfig = { ...config, api_version: latestVersion };
          
          const { error: updateError } = await supabaseClient
            .from("sources")
            .update({ 
              config: updatedConfig,
              updated_at: new Date().toISOString(),
              last_validated_at: new Date().toISOString()
            })
            .eq("id", source.id);
          
          if (updateError) {
            return {
              id: source.id,
              name: source.name,
              status: "error",
              reason: `Failed to update source: ${updateError.message}`
            };
          }
          
          // Fetch and cache the new schema
          await fetchAndCacheSchema(supabaseClient, source.id, config.storeName, config.accessToken, latestVersion);
          
          return {
            id: source.id,
            name: source.name,
            status: "updated",
            oldVersion: config.api_version,
            newVersion: latestVersion
          };
        } else {
          // Version is already current, but refresh schema cache anyway
          await fetchAndCacheSchema(supabaseClient, source.id, config.storeName, config.accessToken, latestVersion);
          
          return {
            id: source.id,
            name: source.name,
            status: "current",
            version: latestVersion
          };
        }
      } catch (error) {
        console.error(`Error updating source ${source.id}:`, error);
        return {
          id: source.id,
          name: source.name,
          status: "error",
          reason: error.message
        };
      }
    }));
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Shopify sources version update completed",
        results,
        updated: results.filter(r => r.status === "updated").length,
        current: results.filter(r => r.status === "current").length,
        errors: results.filter(r => r.status === "error").length,
        skipped: results.filter(r => r.status === "skipped").length
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in update Shopify versions function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error" 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

// Helper function to fetch and cache schema for a source
async function fetchAndCacheSchema(
  supabaseClient: any,
  sourceId: string,
  storeName: string,
  accessToken: string,
  apiVersion: string
) {
  try {
    console.log(`Fetching schema for ${storeName} with API version ${apiVersion}`);
    
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
    
    const endpoint = `https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: introspectionQuery })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GraphQL schema: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors[0].message}`);
    }
    
    // Save schema to database
    const { error: insertError } = await supabaseClient
      .from("source_schemas")
      .upsert({
        source_id: sourceId,
        api_version: apiVersion,
        schema: result.data,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      throw new Error(`Failed to save schema: ${insertError.message}`);
    }
    
    console.log(`Successfully cached schema for source ${sourceId}, version ${apiVersion}`);
    return true;
  } catch (error) {
    console.error(`Error fetching/caching schema:`, error);
    return false;
  }
}
