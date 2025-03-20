
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch dataset preview
 */
export async function fetchDatasetPreview(executionId: string) {
  try {
    console.log(`Sending preview request for execution ID: ${executionId}`);
    
    // First check if the function exists
    const { data: functions } = await supabase.functions.listFunctions();
    console.log("Available functions for preview:", functions?.map(f => f.name).join(", "));
    
    // Explicitly stringify the payload
    const payload = JSON.stringify({ executionId, limit: 100 }); // Increased limit for more comprehensive results
    console.log("Sending preview request with payload:", payload);
    
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Preview",
      { 
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (error) {
      console.error("Error fetching dataset preview:", error);
      throw error;
    }
    
    if (!data) {
      throw new Error("No data returned from preview function");
    }
    
    console.log("Dataset preview response received:", data);
    return data;
  } catch (error) {
    console.error("Error fetching dataset preview:", error);
    throw error;
  }
}
