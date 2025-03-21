
import { supabase } from "@/integrations/supabase/client";
import { ShopifyCredentials, ValidationResult } from "@/types/sourceTypes";
import { Source } from "@/hooks/useSources";

/**
 * Validates a Shopify connection using the provided credentials via Edge Function
 */
export async function validateShopifyConnection(credentials: ShopifyCredentials): Promise<ValidationResult> {
  try {
    console.log("Validating Shopify credentials via Edge Function:", { 
      credentials: { ...credentials, accessToken: "REDACTED", apiSecret: "REDACTED" }
    });
    
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
 * Fetches the Shopify schema for a source via Edge Function
 */
export async function fetchShopifySchema(sourceId: string, forceUpdate = false): Promise<{
  success: boolean;
  message?: string;
  cached?: boolean;
  error?: string;
}> {
  try {
    console.log(`Fetching Shopify schema via Edge Function, sourceId: ${sourceId}, forceUpdate: ${forceUpdate}`);
    
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

/**
 * Tests an existing Shopify source connection
 */
export async function testShopifyConnection(sourceId: string, source: Source) {
  try {
    console.log("Testing Shopify connection:", { 
      sourceId, 
      config: { ...source.config, accessToken: "REDACTED", apiSecret: "REDACTED" }
    });
    
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
    
    // If successful, check if API version changed
    if (validationResult.config?.api_version !== source.config.api_version) {
      console.log(`Updating Shopify API version from ${source.config.api_version} to ${validationResult.config?.api_version}`);
      
      const { error: updateError } = await supabase
        .from("sources")
        .update({ 
          config: validationResult.config,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", sourceId);
      
      if (updateError) {
        console.error("Error updating source:", updateError);
        return { 
          success: false, 
          message: updateError.message || "Failed to update source with new API version" 
        };
      }
      
      // Also update the schema when the API version changes
      try {
        console.log(`Fetching updated schema for source ${sourceId} with new API version ${validationResult.config?.api_version}`);
        await fetchShopifySchema(sourceId, true);
      } catch (schemaError) {
        console.error("Error updating schema after API version change:", schemaError);
        // Continue anyway
      }
      
      return { 
        success: true, 
        updated: true, 
        message: `Updated to latest Shopify API version: ${validationResult.config?.api_version}` 
      };
    }
    
    // If last validation was more than 7 days ago, update the schema
    const lastValidatedAt = new Date(source.last_validated_at || 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (lastValidatedAt < sevenDaysAgo) {
      console.log(`Schema is older than 7 days (last update: ${lastValidatedAt.toISOString()}), refreshing`);
      try {
        await fetchShopifySchema(sourceId, true);
        
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
      updated: false 
    };
  } catch (error) {
    console.error("Error testing Shopify connection:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}
