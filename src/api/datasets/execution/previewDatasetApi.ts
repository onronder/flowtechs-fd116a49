
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch dataset preview data from the Dataset_Preview edge function
 */
export async function fetchDatasetPreview(
  executionId: string, 
  options: { 
    limit?: number;
    maxRetries?: number;
    retryDelay?: number;
    checkStatus?: boolean;
  } = {}
) {
  const limit = options.limit || 5; // Default limit to 5 records 
  const maxRetries = options.maxRetries || 0;
  const retryDelay = options.retryDelay || 1000;
  const checkStatus = options.checkStatus || false;
  
  // Function to perform the actual API call
  const fetchPreview = async (retry = 0): Promise<any> => {
    try {
      console.log(`Sending preview request for execution ID: ${executionId}, retry: ${retry}`);
      
      // Unique timer name for each call to avoid conflicts
      const timerName = `preview_request_${executionId}_${Date.now()}`;
      console.time(timerName);
      
      // Prepare the payload
      const payload = { 
        executionId,
        limit, // Explicitly limit the data to reduce exposure of sensitive info
        checkStatus,
        // Signal to the edge function to exclude sensitive data
        secureMode: true
      };
      
      console.log("Sending preview request with payload:", JSON.stringify(payload));
      
      // Call the edge function with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        // Call the edge function
        const { data, error } = await supabase.functions.invoke("Dataset_Preview", {
          body: payload,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // End the performance timer
        console.timeEnd(timerName);
        
        if (error) {
          console.error("Error from Dataset_Preview function:", error);
          throw new Error(`Preview fetch error: ${error.message || JSON.stringify(error)}`);
        }
        
        if (!data) {
          throw new Error("Invalid response from preview function - empty response");
        }
        
        // Log the status and other important details
        console.log(`Dataset preview response: status=${data.status}, rows=${data.preview?.length || 0}, totalCount=${data.totalCount || 0}`);
        
        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Preview request timed out");
        throw new Error("Preview request timed out after 30 seconds");
      }
      
      if (retry < maxRetries) {
        console.log(`Retry ${retry + 1}/${maxRetries} after error:`, error);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchPreview(retry + 1);
      }
      
      // No more retries, throw the error
      throw error;
    }
  };
  
  return fetchPreview();
}
