
// src/api/sourceApi.ts
import { supabase } from "@/integrations/supabase/client";

// Fetch user sources
export async function fetchUserSources() {
  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching sources:", error);
    return [];
  }
}

// Fetch a specific source by ID
export async function fetchSourceById(sourceId: string) {
  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching source:", error);
    throw error;
  }
}

// Add function to fetch source schema
export async function fetchSourceSchema(sourceId: string) {
  try {
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { sourceId }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching source schema:", error);
    throw error;
  }
}
