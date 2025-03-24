
// src/api/sourceTypes/shopifySourceApi.ts
import { supabase } from "@/integrations/supabase/client";
import { Source } from "@/hooks/useSources";
import { detectLatestShopifyVersion } from "@/utils/shopifyApi";
import { redactSensitiveInfo, createSecureSourceObject } from "@/api/utils/securityUtils";

/**
 * Validates a Shopify connection using the provided credentials
 */
export async function validateShopifyConnection(credentials: any) {
  try {
    console.log("Validating Shopify credentials:", redactSensitiveInfo(credentials));
    
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
  } catch (error) {
    console.error("Error validating Shopify connection:", error);
    throw error;
  }
}

/**
 * Tests an existing Shopify source connection
 */
export async function testShopifyConnection(sourceId: string, source: Source) {
  try {
    console.log("Testing Shopify connection:", { 
      sourceId, 
      config: redactSensitiveInfo(source.config)
    });
    
    // Validate with the endpoint directly
    const result = await validateShopifyConnection(source.config);
    
    // If successful, check if API version changed
    if (result.success) {
      // Always update the source if the API version has changed
      if (result.config.api_version !== source.config.api_version) {
        console.log(`Updating Shopify API version from ${source.config.api_version} to ${result.config.api_version}`);
        
        const { error: updateError } = await supabase
          .from("sources")
          .update({ 
            config: result.config,
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
          console.log(`Fetching updated schema for source ${sourceId} with new API version ${result.config.api_version}`);
          // Fix: Import and use fetchSourceSchema with correct arguments
          await fetchSourceSchema(sourceId, true);
        } catch (schemaError) {
          console.error("Error updating schema after API version change:", schemaError);
          // Continue anyway
        }
        
        return { success: true, updated: true, message: `Updated to latest Shopify API version: ${result.config.api_version}` };
      }
      
      // If last validation was more than 7 days ago, update the schema
      const lastValidatedAt = new Date(source.last_validated_at || 0);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (lastValidatedAt < sevenDaysAgo) {
        console.log(`Schema is older than 7 days (last update: ${lastValidatedAt.toISOString()}), refreshing`);
        try {
          // Fix: Use fetchSourceSchema with correct arguments
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
    
    return { success: result.success, updated: false };
  } catch (error) {
    console.error("Error testing Shopify connection:", error);
    throw error;
  }
}

// Import the fetchSourceSchema function from the main API
import { fetchSourceSchema } from "../sourceApi";
