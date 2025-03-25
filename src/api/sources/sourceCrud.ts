
import { supabase } from "@/integrations/supabase/client";
import { Source } from "@/hooks/useSources";

/**
 * Fetches all sources for the current user
 */
export async function fetchUserSources() {
  try {
    console.log("Fetching all user sources");
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching sources:", error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in fetchUserSources:", error);
    throw error;
  }
}

/**
 * Fetches a single source by ID
 */
export async function fetchSourceById(sourceId: string) {
  try {
    console.log(`Fetching source details for ID: ${sourceId}`);
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
    
    if (error) {
      console.error("Error fetching source:", error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error("Error in fetchSourceById:", error);
    throw error;
  }
}

/**
 * Deletes a source from the database
 */
export async function deleteSource(sourceId: string) {
  try {
    console.log(`Deleting source with ID: ${sourceId}`);
    
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId);
    
    if (error) {
      console.error("Error deleting source:", error);
      throw new Error(error.message || "Failed to delete source");
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteSource:", error);
    throw error;
  }
}
