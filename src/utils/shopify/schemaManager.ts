
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches and caches a Shopify store's GraphQL schema
 * @param sourceId The source ID in the database
 * @param storeName The Shopify store name
 * @param accessToken The access token for the store
 * @param apiSecret The API secret for the store
 * @param apiVersion The API version to use
 * @param forceUpdate Whether to force a schema update even if cached
 */
export async function fetchAndCacheShopifySchema(
  sourceId: string,
  storeName: string, 
  accessToken: string,
  apiSecret: string,
  apiVersion: string,
  forceUpdate = false
): Promise<boolean> {
  try {
    console.log(`Fetching schema for store: ${storeName}, API version: ${apiVersion}`);
    
    // Check if we already have this schema version cached and it's not a forced update
    if (!forceUpdate) {
      const { data: existingSchema } = await supabase
        .from('source_schemas')
        .select('created_at')
        .eq('source_id', sourceId)
        .eq('api_version', apiVersion)
        .single();
      
      if (existingSchema) {
        console.log(`Schema for version ${apiVersion} already exists. Skipping fetch.`);
        return true;
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
    
    // Fetch the schema using the GraphQL endpoint
    const endpoint = `https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({ query: introspectionQuery })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GraphQL schema. Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors[0].message}`);
    }
    
    // Save schema to database
    const { error: insertError } = await supabase
      .from('source_schemas')
      .upsert({
        source_id: sourceId,
        api_version: apiVersion,
        schema: result.data
      });
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`Successfully cached schema for version ${apiVersion}`);
    return true;
  } catch (error) {
    console.error(`Error fetching Shopify schema:`, error);
    return false;
  }
}
