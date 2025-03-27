
import { supabase } from "@/integrations/supabase/client";

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
    
    // Use the Supabase Edge Function to fetch the schema
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { sourceId, forceUpdate }
    });
    
    if (error) {
      console.error("Edge function error:", error);
      return { 
        success: false, 
        error: error.message || "Failed to fetch Shopify schema" 
      };
    }
    
    // Handle the response properly - check if data is present and contains success status
    if (!data) {
      console.error("No data returned from fetchSourceSchema function");
      return {
        success: false,
        error: "No data returned from schema fetch"
      };
    }
    
    if (!data.success) {
      const errorMsg = data.error || "Unknown error fetching Shopify schema";
      console.error("Schema fetch unsuccessful:", errorMsg);
      return { 
        success: false, 
        error: errorMsg
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
