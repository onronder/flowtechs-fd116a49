
import { supabase } from "@/integrations/supabase/client";

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
