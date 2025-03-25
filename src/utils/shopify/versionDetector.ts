
import { supabase } from "@/integrations/supabase/client";

/**
 * Detects the latest available Shopify API version for a store
 * @param storeName The Shopify store name 
 * @param accessToken The Shopify access token
 * @returns The latest API version string
 */
export async function detectLatestShopifyVersion(
  storeName: string,
  accessToken: string
): Promise<string> {
  try {
    console.log(`Detecting latest API version for store: ${storeName}`);
    
    // Fetch available versions from Shopify
    const response = await fetch(`https://${storeName}.myshopify.com/admin/api/versions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch API versions: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.supported_versions || !data.supported_versions.length) {
      throw new Error('No API versions found in response');
    }
    
    // Sort versions to find the latest one (format: YYYY-MM)
    const sortedVersions = [...data.supported_versions].sort((a, b) => {
      return b.handle.localeCompare(a.handle);
    });
    
    const latestVersion = sortedVersions[0].handle;
    console.log(`Latest Shopify API version: ${latestVersion}`);
    
    return latestVersion;
  } catch (error) {
    console.error('Error detecting latest Shopify version:', error);
    // Return a reasonable default in case of errors
    return '2023-10'; // Example fallback version
  }
}

/**
 * Schedules a weekly update for all Shopify sources
 */
export async function scheduleWeeklyUpdates() {
  try {
    // Call the updateAllShopifySources utility function via a scheduled task
    const { data, error } = await supabase.functions.invoke("updateShopifyVersions", {
      body: { scheduled: true }
    });
    
    if (error) {
      console.error("Failed to schedule updates:", error);
      return false;
    }
    
    console.log("Scheduled update completed:", data);
    return true;
  } catch (error) {
    console.error("Error in scheduleWeeklyUpdates:", error);
    return false;
  }
}
