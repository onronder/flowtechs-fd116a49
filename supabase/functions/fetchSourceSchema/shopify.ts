
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
          // Sort versions to find the latest one
          const sortedVersions = [...versionData.supported_versions].sort((a, b) => {
            return b.handle.localeCompare(a.handle);
          });
          
          apiVersion = sortedVersions[0].handle;
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
      } else {
        console.error(`Failed to fetch API versions: ${versionResponse.status} ${versionResponse.statusText}`);
      }
    } catch (error) {
      console.error(`Error fetching current API version: ${error.message}`);
    }
  }
  
  if (!apiVersion) {
    apiVersion = "2025-01"; // Fallback to a recent version
    console.log(`Using fallback API version: ${apiVersion}`);
  }
  
  // Verify required credentials
  if (!config.storeName || !config.accessToken) {
    return errorResponse("Missing required Shopify credentials: store name or access token");
  }
  
  const shopifyEndpoint = `https://${config.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
  
  // If not forcing update, check if we already have this schema version cached
  if (!forceUpdate) {
    try {
      const { data: existingSchema, error: schemaError } = await supabaseClient
        .from("source_schemas")
        .select("created_at")
        .eq("source_id", source.id)
        .eq("api_version", apiVersion)
        .single();
        
      if (!schemaError && existingSchema) {
        console.log(`Schema for version ${apiVersion} already exists and not forcing update. Skipping fetch.`);
        
        // Update last_validated_at in sources table
        await supabaseClient
          .from("sources")
          .update({ 
            last_validated_at: new Date().toISOString()
          })
          .eq("id", source.id);
          
        return successResponse({
          message: "Using cached schema",
          apiVersion: apiVersion,
          cached: true
        });
      }
    } catch (cacheError) {
      console.log("No cached schema found or error checking cache:", cacheError);
      // Continue with fetching a new schema
    }
  }
  
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
      apiVersion: apiVersion,
      cached: false
    });
  } catch (error) {
    console.error("Error in fetchShopifySchema:", error);
    return errorResponse(`Schema fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
