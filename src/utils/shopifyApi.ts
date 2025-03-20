
import { supabase } from "@/integrations/supabase/client";

/**
 * Detects the latest Shopify API version from a store
 * @param storeName The Shopify store name (without myshopify.com)
 * @param accessToken The access token for the store
 * @returns The latest API version (e.g., "2025-01")
 */
export async function detectLatestShopifyVersion(storeName: string, accessToken: string): Promise<string> {
  try {
    console.log(`Detecting latest Shopify API version for store: ${storeName}`);
    
    // Try to fetch available versions from Shopify's version endpoint
    const response = await fetch(`https://${storeName}.myshopify.com/admin/api/versions`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch versions. Status: ${response.status}. Using fallback version.`);
      return "2025-01"; // Fallback to current known version
    }
    
    const data = await response.json();
    console.log(`Available Shopify API versions:`, data);
    
    if (data.supported_versions && data.supported_versions.length > 0) {
      // First version in the list is always the latest
      const latestVersion = data.supported_versions[0].handle;
      console.log(`Using latest Shopify API version: ${latestVersion}`);
      return latestVersion;
    }
    
    // Fallback to current known version if no versions found
    console.warn(`No supported versions found. Using fallback version.`);
    return "2025-01";
  } catch (error) {
    console.error(`Error detecting Shopify API version:`, error);
    return "2025-01"; // Fallback in case of error
  }
}

/**
 * Fetches and caches a Shopify store's GraphQL schema
 * @param sourceId The source ID in the database
 * @param storeName The Shopify store name
 * @param accessToken The access token for the store
 * @param apiVersion The API version to use
 * @param forceUpdate Whether to force a schema update even if cached
 */
export async function fetchAndCacheShopifySchema(
  sourceId: string,
  storeName: string, 
  accessToken: string,
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

/**
 * Updates source config with latest API version and caches schema
 * @param sourceId The source ID in the database
 */
export async function updateSourceApiVersionAndSchema(sourceId: string): Promise<boolean> {
  try {
    // Get the source details
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('id', sourceId)
      .single();
    
    if (sourceError) throw sourceError;
    if (!source || source.source_type !== 'shopify') {
      console.warn(`Source ${sourceId} is not a Shopify source or doesn't exist`);
      return false;
    }
    
    // Extract required credentials
    const { storeName, accessToken } = source.config;
    
    if (!storeName || !accessToken) {
      console.error(`Missing required credentials for source ${sourceId}`);
      return false;
    }
    
    // Detect latest version
    const latestVersion = await detectLatestShopifyVersion(storeName, accessToken);
    
    // Check if we need to update the version
    if (source.config.api_version === latestVersion) {
      console.log(`Source ${sourceId} already using latest version ${latestVersion}`);
      
      // Still fetch/cache schema if needed
      await fetchAndCacheShopifySchema(
        sourceId,
        storeName,
        accessToken,
        latestVersion,
        false
      );
      
      return false; // No update needed
    }
    
    // Update config with new version
    const updatedConfig = {
      ...source.config,
      api_version: latestVersion
    };
    
    const { error: updateError } = await supabase
      .from('sources')
      .update({ 
        config: updatedConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId);
    
    if (updateError) throw updateError;
    
    // Fetch and cache the schema for the new version
    await fetchAndCacheShopifySchema(
      sourceId,
      storeName,
      accessToken,
      latestVersion,
      true
    );
    
    console.log(`Updated source ${sourceId} to version ${latestVersion}`);
    return true;
  } catch (error) {
    console.error(`Error updating source API version:`, error);
    return false;
  }
}
