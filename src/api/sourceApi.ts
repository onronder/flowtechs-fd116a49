
import { supabase } from "@/integrations/supabase/client";
import { Source } from "@/hooks/useSources";
import { detectLatestShopifyVersion } from "@/utils/shopifyApi";

/**
 * Redacts sensitive information from credentials for logging
 */
function redactSensitiveInfo(credentials: any) {
  if (!credentials) return {};
  
  const redacted = { ...credentials };
  const sensitiveFields = ['accessToken', 'apiKey', 'password', 'consumerSecret', 'secretKey', 'token'];
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = "REDACTED";
    }
  }
  
  return redacted;
}

/**
 * Validates the connection to a data source
 */
export async function validateSourceConnection(sourceType: string, credentials: any) {
  try {
    console.log("Validating credentials:", { 
      sourceType, 
      credentials: redactSensitiveInfo(credentials)
    });
    
    if (sourceType === 'shopify') {
      // For Shopify, we need to detect the latest API version
      const { storeName, accessToken } = credentials;
      
      if (!storeName || !accessToken) {
        throw new Error('Missing required Shopify credentials');
      }
      
      // Detect latest API version
      const apiVersion = await detectLatestShopifyVersion(storeName, accessToken);
      
      // Set the detected version in credentials
      const updatedCredentials = {
        ...credentials,
        api_version: apiVersion
      };
      
      // Test connection with detected version
      const shopifyEndpoint = `https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
      const testQuery = `
        query {
          shop {
            name
            plan {
              displayName
            }
          }
        }
      `;
      
      console.log(`Testing GraphQL endpoint with detected version: ${shopifyEndpoint}`);
      
      const response = await fetch(shopifyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken
        },
        body: JSON.stringify({ query: testQuery })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify connection failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }
      
      return {
        success: true,
        config: updatedCredentials,
        shopInfo: result.data.shop
      };
    }
    
    // For other source types, use the existing supabase function
    console.log("Validating source connection:", { 
      sourceType, 
      credentials: redactSensitiveInfo(credentials)
    });
    
    const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
      body: { sourceType, config: credentials },
    });
    
    if (error) {
      console.error("Error from Supabase function:", error);
      throw new Error(error.message || "Failed to validate source connection");
    }
    
    return data;
  } catch (error) {
    console.error("Error validating source connection:", error);
    throw error;
  }
}

/**
 * Fetches the schema for a data source
 */
export async function fetchSourceSchema(sourceId: string, forceUpdate = false) {
  try {
    console.log(`Fetching schema for source ${sourceId}, forceUpdate: ${forceUpdate}`);
    
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { sourceId, forceUpdate },
    });
    
    if (error) {
      console.error("Error from Supabase function:", error);
      throw new Error(error.message || "Failed to fetch source schema");
    }
    
    console.log("Schema fetch response:", data);
    return data;
  } catch (error) {
    console.error("Error fetching source schema:", error);
    throw error;
  }
}

/**
 * Tests the connection to an existing source
 */
export async function testSourceConnection(sourceId: string, source: Source) {
  try {
    console.log("Testing source connection:", { 
      sourceId, 
      sourceType: source.source_type,
      config: redactSensitiveInfo(source.config)
    });
    
    const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
      body: { 
        sourceType: source.source_type, 
        config: source.config 
      },
    });
    
    if (error) {
      console.error("Error from Supabase function:", error);
      throw new Error(error.message || "Failed to test source connection");
    }
    
    // If successful and source type is Shopify, check if API version changed
    if (data.success && source.source_type === "shopify") {
      // Always update the source if the API version has changed
      if (data.config.api_version !== source.config.api_version) {
        console.log(`Updating Shopify API version from ${source.config.api_version} to ${data.config.api_version}`);
        
        const { error: updateError } = await supabase
          .from("sources")
          .update({ 
            config: data.config,
            last_validated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", sourceId);
        
        if (updateError) {
          console.error("Error updating source:", updateError);
          throw new Error(updateError.message || "Failed to update source with new API version");
        }
        
        // Also update the schema when the API version changes
        try {
          console.log(`Fetching updated schema for source ${sourceId} with new API version ${data.config.api_version}`);
          await fetchSourceSchema(sourceId, true);
        } catch (schemaError) {
          console.error("Error updating schema after API version change:", schemaError);
          // Continue anyway
        }
        
        return { success: true, updated: true, message: `Updated to latest Shopify API version: ${data.config.api_version}` };
      }
      
      // If last validation was more than 7 days ago, update the schema
      const lastValidatedAt = new Date(source.last_validated_at || 0);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (lastValidatedAt < sevenDaysAgo) {
        console.log(`Schema is older than 7 days (last update: ${lastValidatedAt.toISOString()}), refreshing`);
        try {
          await fetchSourceSchema(sourceId, true);
          
          // Update last_validated_at timestamp
          await supabase
            .from("sources")
            .update({ 
              last_validated_at: new Date().toISOString()
            })
            .eq("id", sourceId);
            
          return { success: true, updated: true, message: "Updated schema data (7+ days since last update)" };
        } catch (schemaError) {
          console.error("Error refreshing schema:", schemaError);
          // Continue anyway
        }
      }
    }
    
    return { success: data.success, updated: false };
  } catch (error) {
    console.error("Error testing source connection:", error);
    throw error;
  }
}

/**
 * Deletes a source
 */
export async function deleteSource(sourceId: string) {
  try {
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId);
    
    if (error) {
      console.error("Error deleting source:", error);
      throw new Error(error.message || "Failed to delete source");
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting source:", error);
    throw error;
  }
}
