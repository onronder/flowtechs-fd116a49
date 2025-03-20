
// src/api/datasets/templatesApi.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch predefined query templates
 */
export async function fetchPredefinedTemplates() {
  try {
    const { data, error } = await supabase
      .from("query_templates")
      .select("*")
      .eq("type", "predefined")
      .eq("is_active", true)
      .order("display_name", { ascending: true });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching predefined templates:", error);
    throw error;
  }
}

/**
 * Fetch dependent query templates
 */
export async function fetchDependentTemplates() {
  try {
    const { data, error } = await supabase
      .from("dependent_query_templates")
      .select("*")
      .eq("is_active", true)
      .order("display_name", { ascending: true });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching dependent templates:", error);
    throw error;
  }
}

/**
 * Fetch dataset templates (wrapper for fetchPredefinedTemplates)
 */
export async function fetchDatasetTemplates() {
  // Just return predefined templates for now
  return fetchPredefinedTemplates();
}
