
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
  
  // Verify required values are present
  if (!config.storeName || !config.accessToken || !config.api_version) {
    return errorResponse(`Missing required Shopify configuration: ${!config.storeName ? 'storeName' : ''} ${!config.accessToken ? 'accessToken' : ''} ${!config.api_version ? 'api_version' : ''}`);
  }
  
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
        api_version: config.api_version,
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
        last_validated_at: new Date().toISOString()
      })
      .eq("id", source.id);
      
    if (updateError) {
      console.error("Error updating source validation timestamp:", updateError);
      return errorResponse(`Schema timestamp update failed: ${updateError.message}`);
    }
    
    console.log("Schema stored successfully");
    
    return successResponse({
      message: "Schema fetched and cached successfully"
    });
  } catch (error) {
    console.error("Error in fetchShopifySchema:", error);
    return errorResponse(`Schema fetch failed: ${error.message}`);
  }
}
