
import { supabase } from "@/integrations/supabase/client";
import { ShopifyCredentials, ValidationResult } from "@/types/sourceTypes";
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
        credentials.api_version = "2025-01"; // Fallback to a recent version
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
    
    if (!data || !data.success) {
      const errorMsg = data?.error || "Unknown error validating Shopify connection";
      console.error("Validation error:", errorMsg);
      return { 
        success: false, 
        error: errorMsg 
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
