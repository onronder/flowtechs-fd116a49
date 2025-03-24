
import { supabase } from "@/integrations/supabase/client";
import { detectLatestShopifyVersion } from "./versionDetector";
import { fetchAndCacheShopifySchema } from "./schemaManager";

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
    
    // Extract required credentials from config
    const config = source.config as Record<string, any>;
    const storeName = config.storeName as string;
    const accessToken = config.accessToken as string;
    const apiSecret = config.apiSecret as string;
    
    if (!storeName || !accessToken || !apiSecret) {
      console.error(`Missing required credentials for source ${sourceId}`);
      return false;
    }
    
    // Detect latest version
    const latestVersion = await detectLatestShopifyVersion(storeName, accessToken);
    
    // Get current API version from config
    const currentApiVersion = config.api_version as string;
    
    // Check if we need to update the version
    if (currentApiVersion === latestVersion) {
      console.log(`Source ${sourceId} already using latest version ${latestVersion}`);
      
      // Still fetch/cache schema if needed
      await fetchAndCacheShopifySchema(
        sourceId,
        storeName,
        accessToken,
        apiSecret,
        latestVersion,
        false
      );
      
      return false; // No update needed
    }
    
    // Update config with new version
    const updatedConfig = {
      ...config,
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
      apiSecret,
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
