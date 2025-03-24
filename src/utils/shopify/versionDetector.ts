
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
