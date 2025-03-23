
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
    
    // Use direct fetch for more control over the request
    console.time('preview_request');
    
    // Get the current auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    if (!token) {
      throw new Error("Authentication required to fetch preview");
    }
    
    const response = await fetch("https://sxzgeevxciuxjyxfartx.supabase.co/functions/v1/Dataset_Preview", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload
    });
    
    console.timeEnd('preview_request');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from Dataset_Preview function:", response.status, errorText);
      throw new Error(`Preview error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
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
