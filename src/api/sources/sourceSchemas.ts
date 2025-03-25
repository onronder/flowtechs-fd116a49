
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the schema for a data source
 */
export async function fetchSourceSchema(sourceId: string, forceUpdate = false) {
  try {
    console.log(`Fetching schema for source ${sourceId}${forceUpdate ? ' (force refresh)' : ''}`);
    
    // Invoke the Edge Function to fetch the schema
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { sourceId, forceUpdate }
    });
    
    if (error) {
      console.error("Error fetching schema:", error);
      throw new Error(error.message || "Failed to fetch schema");
    }
    
    if (!data.success) {
      console.error("Schema fetch unsuccessful:", data.error);
      throw new Error(data.error || "Schema fetch unsuccessful");
    }
    
    return data;
  } catch (error) {
    console.error("Error in fetchSourceSchema:", error);
    throw error;
  }
}
