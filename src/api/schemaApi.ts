
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the schema for a data source
 */
export async function fetchSourceSchema(sourceId: string, forceUpdate = false) {
  try {
    console.log(`Fetching schema for source ${sourceId}, forceUpdate: ${forceUpdate}`);
    
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { sourceId, forceUpdate },
    });
    
    if (error) {
      console.error("Error from Supabase function:", error);
      throw new Error(error.message || "Failed to fetch source schema");
    }
    
    console.log("Schema fetch response:", data);
    return data;
  } catch (error) {
    console.error("Error fetching source schema:", error);
    throw error;
  }
}
