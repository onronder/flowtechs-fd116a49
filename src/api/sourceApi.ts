
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

// Get source schedules
export async function getSourceSchedules(sourceId: string) {
  try {
    const { data: datasets, error: datasetsError } = await supabase
      .from("user_datasets")
      .select("id")
      .eq("source_id", sourceId);
      
    if (datasetsError) throw datasetsError;
    if (!datasets || datasets.length === 0) {
      return [];
    }
    
    const datasetIds = datasets.map(d => d.id);
    
    const { data, error } = await supabase
      .from("dataset_schedules")
      .select(`
        id,
        dataset_id,
        schedule_type,
        next_run_time,
        is_active,
        parameters,
        dataset:dataset_id(name)
      `)
      .in("dataset_id", datasetIds)
      .order("next_run_time", { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching source schedules:", error);
    return [];
  }
}
