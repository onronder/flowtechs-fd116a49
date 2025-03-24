
import { supabase } from "@/integrations/supabase/client";
import { fetchShopifySchema } from "./sourceTypes/shopifyApi";

/**
 * Fetches the schema for a data source
 */
export async function fetchSourceSchema(sourceId: string, forceUpdate = false) {
  try {
    console.log(`Fetching schema for source ${sourceId}, forceUpdate: ${forceUpdate}`);
    
    // Get the source details to determine the source type
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("source_type, config")
      .eq("id", sourceId)
      .single();
      
    if (sourceError) {
      console.error("Error fetching source:", sourceError);
      throw new Error(sourceError.message || "Failed to fetch source");
    }
    
    // Type checking and safe access to config.api_version
    const apiVersion = source.config && typeof source.config === 'object' ? 
      (source.config as Record<string, unknown>).api_version : undefined;
    
    console.log(`Source type: ${source.source_type}, API version: ${apiVersion || 'unknown'}`);
    
    // Use type-specific schema fetching
    if (source.source_type === "shopify") {
      return await fetchShopifySchema(sourceId, forceUpdate);
    }
    
    // For other source types, we'll need to implement similar logic
    throw new Error(`Schema fetching not supported for source type: ${source.source_type}`);
  } catch (error) {
    console.error("Error fetching source schema:", error);
    throw error;
  }
}
