
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all sources for the current user
 */
export async function fetchUserSources() {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching sources:", error);
    throw new Error(error.message);
  }
  
  return data || [];
}

/**
 * Fetches a single source by ID
 */
export async function fetchSourceById(sourceId: string) {
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
}
