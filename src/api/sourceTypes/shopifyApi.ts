
import { supabase } from "@/integrations/supabase/client";
import { ShopifyCredentials, ValidationResult, TestConnectionResult } from "@/types/sourceTypes";
import { Source } from "@/hooks/useSources";
import { fetchSourceSchema } from "../sources/sourceSchemas";
import { detectLatestShopifyVersion } from "@/utils/shopify/versionDetector";

/**
 * Validates a Shopify connection using the provided credentials
 */
export async function validateShopifyConnection(credentials: ShopifyCredentials): Promise<ValidationResult> {
  try {
    console.log("Validating Shopify credentials:", { 
      credentials: { ...credentials, accessToken: "REDACTED", apiSecret: "REDACTED" }
    });
    
    // Check if we need to detect the latest API version
    if (!credentials.api_version) {
      try {
        console.log("No API version provided, detecting latest version");
        const latestVersion = await detectLatestShopifyVersion(
          credentials.storeName,
          credentials.accessToken
        );
        
        console.log(`Detected latest Shopify API version: ${latestVersion}`);
        credentials.api_version = latestVersion;
      } catch (versionError) {
        console.error("Error detecting API version:", versionError);
        // Continue with validation, the Edge Function will attempt to detect version
      }
    }
    
    // Invoke the Edge Function to validate the Shopify connection
    const { data, error } = await supabase.functions.invoke("validateShopifySource", {
      body: credentials
    });
    
    if (error) {
      console.error("Edge function error:", error);
      return { 
        success: false, 
        error: error.message || "Failed to validate Shopify connection" 
      };
    }
    
    if (!data.success) {
      return { 
        success: false, 
        error: data.error || "Unknown error validating Shopify connection" 
      };
    }
    
    // Make sure we're using the detected API version from the response
    if (data.config?.api_version && data.config.api_version !== credentials.api_version) {
      console.log(`Updating API version from ${credentials.api_version} to ${data.config.api_version}`);
      credentials.api_version = data.config.api_version;
    }
    
    return {
      success: true,
      config: data.config,
      shopInfo: data.shopInfo
    };
  } catch (error) {
    console.error("Error validating Shopify connection:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}

/**
 * Tests an existing Shopify source connection
 * @param sourceId The ID of the source to test
 * @param source The source object containing configuration
 * @returns Result of the connection test
 */
export async function testShopifyConnection(sourceId: string, source: Source): Promise<TestConnectionResult> {
  try {
    console.log("Testing Shopify connection:", { 
      sourceId, 
      config: { ...source.config, accessToken: "REDACTED", apiSecret: "REDACTED" }
    });
    
    // First, try to detect the latest API version directly
    let currentApiVersion = source.config.api_version;
    let latestApiVersion = currentApiVersion;
    
    try {
      console.log(`Detecting latest API version for store: ${source.config.storeName}`);
      latestApiVersion = await detectLatestShopifyVersion(
        source.config.storeName,
        source.config.accessToken
      );
      console.log(`Current API version: ${currentApiVersion}, Latest available: ${latestApiVersion}`);
    } catch (versionError) {
      console.error("Error detecting latest API version:", versionError);
      // Continue with validation using current version
    }
    
    // Check if API version needs updating
    let updated = false;
    if (latestApiVersion && latestApiVersion !== currentApiVersion) {
      console.log(`API version needs updating from ${currentApiVersion} to ${latestApiVersion}`);
      
      // Update the source with the new API version
      const updatedConfig = { ...source.config, api_version: latestApiVersion };
      const { error: updateError } = await supabase
        .from("sources")
        .update({ 
          config: updatedConfig,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", sourceId);
      
      if (updateError) {
        console.error("Error updating API version:", updateError);
        return { 
          success: false, 
          message: updateError.message || "Failed to update API version" 
        };
      }
      
      // Update succeeded, now fetch the new schema
      console.log(`Fetching schema for updated API version ${latestApiVersion}`);
      try {
        await fetchSourceSchema(sourceId, true);
        updated = true;
      } catch (schemaError) {
        console.error("Error updating schema after API version change:", schemaError);
        // Continue anyway since the version update succeeded
      }
      
      return { 
        success: true, 
        updated: true, 
        message: `Updated to latest Shopify API version: ${latestApiVersion}` 
      };
    }
    
    // If API version is current, validate the connection with the Edge Function
    // Validate credentials - ensure we're passing a properly typed object
    const shopifyCredentials: ShopifyCredentials = {
      storeName: source.config.storeName,
      clientId: source.config.clientId,
      apiSecret: source.config.apiSecret,
      accessToken: source.config.accessToken,
      api_version: source.config.api_version
    };
    
    const validationResult = await validateShopifyConnection(shopifyCredentials);
    
    if (!validationResult.success) {
      return { 
        success: false, 
        message: validationResult.error || "Failed to validate Shopify connection" 
      };
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
          
        return { 
          success: true, 
          updated: true, 
          message: "Updated schema data (7+ days since last update)" 
        };
      } catch (schemaError) {
        console.error("Error refreshing schema:", schemaError);
        // Continue anyway
      }
    }
    
    return { 
      success: true, 
      updated: updated 
    };
  } catch (error) {
    console.error("Error testing Shopify connection:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}

/**
 * Fetches the Shopify schema for a source
 * @param sourceId The ID of the source
 * @param forceUpdate Whether to force update the schema even if it's cached
 * @returns Result of the schema fetch operation
 */
export async function fetchShopifySchema(sourceId: string, forceUpdate = false): Promise<{
  success: boolean;
  message?: string;
  cached?: boolean;
  error?: string;
}> {
  try {
    console.log(`Fetching Shopify schema, sourceId: ${sourceId}, forceUpdate: ${forceUpdate}`);
    
    // First get the source details to check current API version
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
      
    if (sourceError) {
      console.error("Error fetching source:", sourceError);
      return { 
        success: false, 
        error: sourceError.message || "Failed to fetch source" 
      };
    }
    
    // Try to detect the latest API version
    let currentApiVersion = source.config.api_version;
    let latestApiVersion = currentApiVersion;
    
    try {
      console.log(`Detecting latest API version for store: ${source.config.storeName}`);
      latestApiVersion = await detectLatestShopifyVersion(
        source.config.storeName,
        source.config.accessToken
      );
      console.log(`Current API version: ${currentApiVersion}, Latest available: ${latestApiVersion}`);
      
      // Update source if version has changed
      if (latestApiVersion !== currentApiVersion) {
        console.log(`Updating API version from ${currentApiVersion} to ${latestApiVersion}`);
        
        const updatedConfig = { ...source.config, api_version: latestApiVersion };
        await supabase
          .from("sources")
          .update({ 
            config: updatedConfig,
            updated_at: new Date().toISOString()
          })
          .eq("id", sourceId);
          
        // Use the latest version for schema fetch
        source.config.api_version = latestApiVersion;
        forceUpdate = true; // Force schema update when API version changes
      }
    } catch (versionError) {
      console.error("Error detecting latest API version:", versionError);
      // Continue with current version
    }
    
    // Invoke the Edge Function to fetch the schema
    const { data, error } = await supabase.functions.invoke("fetchShopifySchema", {
      body: { sourceId, forceUpdate }
    });
    
    if (error) {
      console.error("Edge function error:", error);
      return { 
        success: false, 
        error: error.message || "Failed to fetch Shopify schema" 
      };
    }
    
    if (!data.success) {
      return { 
        success: false, 
        error: data.error || "Unknown error fetching Shopify schema" 
      };
    }
    
    return {
      success: true,
      message: data.message,
      cached: data.cached
    };
  } catch (error) {
    console.error("Error fetching Shopify schema:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}
