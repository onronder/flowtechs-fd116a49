
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
    
    // Detect the latest API version if needed
    let apiVersion = config.api_version;
    
    // If forced update or no version, detect latest version
    if (forceUpdate || !apiVersion) {
      try {
        console.log(`[fetchShopifySchema] Detecting latest API version for ${config.storeName}`);
        const versionResponse = await fetch(
          `https://${config.storeName}.myshopify.com/admin/api/versions`,
          {
            headers: {
              "X-Shopify-Access-Token": config.accessToken,
              "Content-Type": "application/json"
            }
          }
        );
        
        if (versionResponse.ok) {
          const versionData = await versionResponse.json();
          
          if (versionData.supported_versions && versionData.supported_versions.length > 0) {
            // Sort to get latest version
            const sortedVersions = [...versionData.supported_versions].sort((a, b) => {
              return b.handle.localeCompare(a.handle);
            });
            
            const detectedVersion = sortedVersions[0].handle;
            console.log(`[fetchShopifySchema] Detected latest API version: ${detectedVersion}`);
            
            // Update version if it has changed
            if (apiVersion !== detectedVersion) {
              apiVersion = detectedVersion;
              
              // Update source config with new version
              const updatedConfig = { ...config, api_version: apiVersion };
              const { error: updateError } = await supabaseClient
                .from("sources")
                .update({ 
                  config: updatedConfig,
                  updated_at: new Date().toISOString()
                })
                .eq("id", sourceId);
                
              if (updateError) {
                console.error("[fetchShopifySchema] Error updating source API version:", updateError);
                // Continue anyway using the detected version
              } else {
                console.log(`[fetchShopifySchema] Updated source to use API version: ${apiVersion}`);
              }
            }
          }
        } else {
          console.error(`[fetchShopifySchema] Version detection failed: ${versionResponse.status}`);
        }
      } catch (versionError) {
        console.error("[fetchShopifySchema] Error detecting API version:", versionError);
        // Continue with current version
      }
    }
    
    if (!apiVersion) {
      console.error("[fetchShopifySchema] No API version available");
      return errorResponse("Could not determine Shopify API version");
    }
    
    if (!config.storeName || !config.accessToken) {
      console.error("[fetchShopifySchema] Missing required credentials");
      return errorResponse("Missing required Shopify credentials");
    }
    
    // Check if we need to update the schema
    if (!forceUpdate) {
      // Check if we already have a schema for this version
      const { data: existingSchema } = await supabaseClient
        .from("source_schemas")
        .select("created_at, api_version")
        .eq("source_id", sourceId)
        .eq("api_version", apiVersion)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (existingSchema) {
        console.log(`[fetchShopifySchema] Schema already exists for version ${apiVersion}, created at ${existingSchema.created_at}`);
        
        // Check if schema is recent (less than 7 days old)
        const schemaDate = new Date(existingSchema.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (schemaDate > sevenDaysAgo) {
          console.log(`[fetchShopifySchema] Schema is recent (less than 7 days old), skipping update`);
          return successResponse({ 
            success: true,
            message: "Using cached schema (less than 7 days old)",
            cached: true,
            schemaVersion: apiVersion
          });
        }
        
        console.log(`[fetchShopifySchema] Schema is older than 7 days, will refresh`);
        // Continue to refresh older schema
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
    
    const shopifyEndpoint = `https://${config.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    console.log(`[fetchShopifySchema] Making GraphQL introspection request to: ${shopifyEndpoint}`);
    
    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.accessToken
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
        api_version: apiVersion,
        schema: result.data,
        created_at: new Date().toISOString()
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
      success: true,
      message: "Schema fetched and cached successfully",
      schemaVersion: apiVersion
    });
  } catch (error) {
    console.error("[fetchShopifySchema] Unhandled error:", error);
    return errorResponse(`Server error: ${error.message}`);
  }
});
