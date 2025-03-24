
import { supabase } from "@/integrations/supabase/client";

interface PreviewOptions {
  limit?: number;
  retryCount?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Fetch dataset preview with enhanced error handling, debugging, and retry capabilities
 */
export async function fetchDatasetPreview(
  executionId: string, 
  options: PreviewOptions = {}
) {
  const { 
    limit = 100,
    retryCount = 0,
    maxRetries = 3,
    retryDelay = 1000
  } = options;
  
  try {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }
    
    console.log(`Sending preview request for execution ID: ${executionId}`);
    
    // First check authentication status
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.error("Authentication error or no session:", authError);
      throw new Error("Authentication required to view preview data");
    }
    
    // Prepare the payload
    const payload = { executionId, limit }; 
    console.log("Sending preview request with payload:", JSON.stringify(payload));
    
    // Use a unique timer name per request to avoid conflicts
    const timerName = `preview_request_${executionId}_${Date.now()}`;
    console.time(timerName);
    
    // Use supabase.functions.invoke instead of direct fetch
    const { data, error } = await supabase.functions.invoke("Dataset_Preview", {
      body: payload
    });
    
    console.timeEnd(timerName);
    
    if (error) {
      // Handle rate limiting
      if (error.message && error.message.includes('429') && retryCount < maxRetries) {
        console.log(`Rate limited. Retry ${retryCount + 1}/${maxRetries} after ${retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchDatasetPreview(executionId, {
          limit,
          retryCount: retryCount + 1,
          maxRetries,
          retryDelay: retryDelay * 2
        });
      }
      
      console.error("Error response from Dataset_Preview:", error);
      throw new Error(`Preview error: ${error.message}`);
    }
    
    // Handle empty responses
    if (!data) {
      console.error("Empty response from preview function");
      throw new Error("Empty response from preview function");
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
