
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";

/**
 * Fetches schema for a Shopify source
 * @param source The source object from the database
 * @param supabaseClient The Supabase client
 * @param forceUpdate Whether to force an update of the schema
 * @returns Response with schema fetch results
 */
export async function fetchShopifySchema(
  source: any, 
  supabaseClient: any, 
  forceUpdate = false
): Promise<Response> {
  const config = source.config;
  console.log(`Fetching Shopify schema for store: ${config.storeName}`);
  
  try {
    // Verify required values are present
    if (!config.storeName || !config.accessToken) {
      return errorResponse(`Missing required Shopify configuration: ${!config.storeName ? 'storeName' : ''} ${!config.accessToken ? 'accessToken' : ''}`);
    }
    
    // If no API version provided, detect it
    let apiVersion = config.api_version;
    if (!apiVersion) {
      console.log(`No API version found, detecting current version for ${config.storeName}`);
      
      try {
        const versionEndpoint = `https://${config.storeName}.myshopify.com/admin/api/versions`;
        const versionResponse = await fetch(versionEndpoint, {
          headers: {
            "X-Shopify-Access-Token": config.accessToken,
            "Content-Type": "application/json"
          }
        });
        
        if (!versionResponse.ok) {
          console.error(`Failed to detect API version: ${versionResponse.status} ${versionResponse.statusText}`);
          const errorText = await versionResponse.text();
          console.error(`Error response: ${errorText.substring(0, 200)}`);
          apiVersion = "2023-10"; // Fallback to a default version
        } else {
          const versionData = await versionResponse.json();
          
          if (!versionData.supported_versions || !versionData.supported_versions.length) {
            console.error("No API versions found in response");
            apiVersion = "2023-10"; // Fallback to a default version
          } else {
            // Sort versions to find the latest one
            const sortedVersions = [...versionData.supported_versions].sort((a, b) => {
              return b.handle.localeCompare(a.handle);
            });
            
            apiVersion = sortedVersions[0].handle;
            console.log(`Detected latest Shopify API version: ${apiVersion}`);
          }
        }
        
        // Update source with detected API version
        if (apiVersion) {
          const updatedConfig = { ...config, api_version: apiVersion };
          const { error: updateError } = await supabaseClient
            .from("sources")
            .update({ 
              config: updatedConfig,
              updated_at: new Date().toISOString()
            })
            .eq("id", source.id);
            
          if (updateError) {
            console.error("Failed to update source with API version:", updateError);
          } else {
            console.log(`Updated source with API version: ${apiVersion}`);
            // Update our local copy of config
            config.api_version = apiVersion;
          }
        }
      } catch (versionError) {
        console.error("Error detecting API version:", versionError);
        apiVersion = "2023-10"; // Fallback to a default version
      }
    }
    
    if (!apiVersion) {
      return errorResponse("Cannot determine Shopify API version");
    }
    
    console.log(`Using Shopify API version: ${apiVersion}`);
    
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
    
    console.log(`Making GraphQL introspection request to Shopify API: ${shopifyEndpoint}`);
    
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
      console.error(`GraphQL request failed: ${response.status} ${errorText.substring(0, 200)}`);
      return errorResponse(`Shopify API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return errorResponse(`GraphQL error: ${result.errors[0].message}`);
    }
    
    console.log("GraphQL schema fetched successfully, saving to database");
    
    // Save schema to database
    const { error: insertError } = await supabaseClient
      .from("source_schemas")
      .upsert({
        source_id: source.id,
        api_version: apiVersion,
        schema: result.data
      });
      
    if (insertError) {
      console.error("Error inserting schema:", insertError);
      return errorResponse(`Schema save failed: ${insertError.message}`);
    }
    
    // Update last_validated_at in sources table
    const { error: updateError } = await supabaseClient
      .from("sources")
      .update({ 
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString() // Also update the updated_at timestamp
      })
      .eq("id", source.id);
      
    if (updateError) {
      console.error("Error updating source validation timestamp:", updateError);
      return errorResponse(`Schema timestamp update failed: ${updateError.message}`);
    }
    
    console.log("Schema stored successfully");
    
    return successResponse({
      message: "Schema fetched and cached successfully",
      apiVersion: apiVersion
    });
  } catch (error) {
    console.error("Error in fetchShopifySchema:", error);
    return errorResponse(`Schema fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
