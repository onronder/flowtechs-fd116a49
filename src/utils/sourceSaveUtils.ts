
// src/utils/sourceSaveUtils.ts
import { supabase } from "@/integrations/supabase/client";
import { fetchSourceSchema } from "@/api/sourceApi";
import { Source } from "@/hooks/useSources";

/**
 * Source data interface
 */
export interface SourceData {
  name: string;
  description?: string;
  source_type: string;
  [key: string]: any;
}

/**
 * Saves a Shopify source to the database
 */
export async function saveShopifySource(sourceData: any) {
  try {
    // Get the current user ID
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    // Process the source data
    const { name, description, storeName, clientId, accessToken, api_version } = sourceData;
    
    // Validate required fields
    if (!name || !storeName || !clientId || !accessToken || !api_version) {
      throw new Error("Missing required fields for Shopify source");
    }
    
    // Prepare config object
    const config = {
      storeName,
      clientId,
      accessToken,
      api_version
    };
    
    // Create the source record
    const { data: source, error } = await supabase
      .from("sources")
      .insert({
        name,
        description,
        source_type: "shopify",
        config,
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
export async function updateShopifySource(sourceId: string, sourceData: any) {
  try {
    // Process the source data
    const { name, description, storeName, clientId, accessToken, api_version } = sourceData;
    
    // Validate required fields
    if (!name || !storeName || !clientId || !accessToken || !api_version) {
      throw new Error("Missing required fields for Shopify source");
    }
    
    // Prepare updated config object
    const config = {
      storeName,
      clientId,
      accessToken,
      api_version
    };
    
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

/**
 * Checks if a source exists by name
 */
export async function checkSourceNameExists(name: string, excludeId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from('sources')
      .select('id')
      .ilike('name', name);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error checking source name:", error);
      return false; // Assume it doesn't exist on error
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error("Error in checkSourceNameExists:", error);
    return false; // Assume it doesn't exist on error
  }
}

/**
 * Generic function to save a source based on its type
 */
export async function saveSource(sourceData: SourceData) {
  if (sourceData.source_type === 'shopify') {
    return saveShopifySource(sourceData);
  }
  throw new Error(`Unsupported source type: ${sourceData.source_type}`);
}
