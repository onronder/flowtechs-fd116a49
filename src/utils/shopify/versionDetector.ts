
/**
 * Detects the latest available Shopify API version
 * @param storeName The Shopify store name
 * @param accessToken The access token for API access
 * @returns The latest API version string
 */
export async function detectLatestShopifyVersion(
  storeName: string,
  accessToken: string
): Promise<string> {
  try {
    console.log(`Detecting latest Shopify API version for store: ${storeName}`);
    
    const versionEndpoint = `https://${storeName}.myshopify.com/admin/api/versions`;
    
    const response = await fetch(versionEndpoint, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      console.error(`Error fetching API versions: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch API versions: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.supported_versions || !data.supported_versions.length) {
      console.error("No API versions found in response");
      throw new Error("No API versions found in response");
    }
    
    // Sort versions to find the latest one
    const sortedVersions = [...data.supported_versions].sort((a, b) => {
      return b.handle.localeCompare(a.handle);
    });
    
    const latestVersion = sortedVersions[0].handle;
    console.log(`Detected latest Shopify API version: ${latestVersion}`);
    
    return latestVersion;
  } catch (error) {
    console.error("Error detecting latest Shopify API version:", error);
    throw error;
  }
}

/**
 * Updates all Shopify sources to the latest API version
 * This should be scheduled to run weekly
 */
export async function scheduleWeeklyUpdates(): Promise<boolean> {
  try {
    console.log("Running scheduled update for Shopify sources");
    
    // Invoke the Edge Function to run the updates
    const { data, error } = await supabase.functions.invoke("updateShopifyVersions", {
      body: { scheduled: true }
    });
    
    if (error) {
      console.error("Error scheduling weekly updates:", error);
      return false;
    }
    
    console.log("Weekly update completed:", data);
    return true;
  } catch (error) {
    console.error("Error in scheduleWeeklyUpdates:", error);
    return false;
  }
}
