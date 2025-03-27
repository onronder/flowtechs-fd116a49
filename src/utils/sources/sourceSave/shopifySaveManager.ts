
import { supabase } from "@/integrations/supabase/client";
import { fetchSourceSchema } from "@/api/sourceApi";
import { SourceDataForApi } from "@/types/source";
import { Database } from "@/integrations/supabase/types";
import { detectLatestShopifyVersion } from "@/utils/shopify/versionDetector";

type SourceType = Database["public"]["Enums"]["source_type"];

/**
 * Saves a Shopify source to the database
 */
export async function saveShopifySource(sourceData: SourceDataForApi) {
  try {
    // Get the current user ID
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    // Process the source data
    const { name, description, source_type, config } = sourceData;
    
    // Validate required fields
    if (!name || !source_type || !config) {
      throw new Error("Missing required fields for Shopify source");
    }
    
    // Ensure we have the latest API version
    let currentConfig = { ...config };
    
    if (source_type === 'shopify' && (!currentConfig.api_version || sourceData.forceLatestVersion)) {
      try {
        const latestVersion = await detectLatestShopifyVersion(
          currentConfig.storeName, 
          currentConfig.accessToken
        );
        
        console.log(`Detected latest Shopify API version: ${latestVersion}`);
        currentConfig.api_version = latestVersion;
      } catch (versionError) {
        console.error("Error detecting latest API version:", versionError);
        // Continue with existing version or default
        if (!currentConfig.api_version) {
          currentConfig.api_version = "2023-10"; // Fallback to a default
        }
      }
    }
    
    // Create the source record
    const { data: source, error } = await supabase
      .from("sources")
      .insert({
        name,
        description,
        source_type: source_type as SourceType, // Cast to the expected enum type
        config: currentConfig,
        is_active: true,
        last_validated_at: new Date().toISOString(),
        user_id: userData.user.id
      })
      .select()
      .single();
      
    if (error) {
      console.error("Error saving Shopify source:", error);
      throw new Error(`Failed to save Shopify source: ${error.message}`);
    }
    
    // Fetch and cache the schema
    try {
      await fetchSourceSchema(source.id, true);
    } catch (schemaError) {
      console.error("Error fetching schema:", schemaError);
      // Continue anyway, as the source was created successfully
    }
    
    return { success: true, source };
  } catch (error) {
    console.error("Error in saveShopifySource:", error);
    throw error;
  }
}

/**
 * Updates a Shopify source in the database
 */
export async function updateShopifySource(sourceId: string, sourceData: SourceDataForApi) {
  try {
    // Process the source data
    const { name, description, config } = sourceData;
    
    // Validate required fields
    if (!name || !config) {
      throw new Error("Missing required fields for Shopify source");
    }
    
    // Update the source record
    const { data: source, error } = await supabase
      .from("sources")
      .update({
        name,
        description,
        config,
        updated_at: new Date().toISOString(),
        last_validated_at: new Date().toISOString()
      })
      .eq("id", sourceId)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating Shopify source:", error);
      throw new Error(`Failed to update Shopify source: ${error.message}`);
    }
    
    // Fetch and cache the schema with the updated source
    try {
      await fetchSourceSchema(source.id, true);
    } catch (schemaError) {
      console.error("Error fetching schema after update:", schemaError);
      // Continue anyway, as the source was updated successfully
    }
    
    return { success: true, source };
  } catch (error) {
    console.error("Error in updateShopifySource:", error);
    throw error;
  }
}
