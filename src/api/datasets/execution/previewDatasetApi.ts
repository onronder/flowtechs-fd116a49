
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch dataset preview with enhanced error handling and debugging
 */
export async function fetchDatasetPreview(executionId: string) {
  try {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }
    
    console.log(`Sending preview request for execution ID: ${executionId}`);
    
    // Explicitly stringify the payload
    const payload = JSON.stringify({ executionId, limit: 100 }); // Increased limit for more comprehensive results
    console.log("Sending preview request with payload:", payload);
    
    // Invoke the function with proper debugging
    console.time('preview_request');
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Preview",
      { 
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    console.timeEnd('preview_request');
    
    if (error) {
      console.error("Error fetching dataset preview:", error);
      throw new Error(`Preview error: ${error.message || JSON.stringify(error)}`);
    }
    
    if (!data) {
      console.error("No data returned from preview function");
      throw new Error("No data returned from preview function");
    }
    
    // Log the response structure to help diagnose issues
    console.log("Dataset preview response received:", data);
    console.log("Dataset preview status:", data.status);
    
    if (data.status === "failed" && data.error) {
      console.error("Execution failed:", data.error);
      throw new Error(`Execution failed: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching dataset preview:", error);
    
    // Enhance error with more details
    const enhancedError = error instanceof Error 
      ? new Error(`Preview fetch failed: ${error.message}`)
      : new Error(`Preview fetch failed: ${JSON.stringify(error)}`);
      
    throw enhancedError;
  }
}
