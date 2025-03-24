
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
  const limit = options.limit || 100;
  const maxRetries = options.maxRetries || 0;
  const retryDelay = options.retryDelay || 1000;
  const checkStatus = options.checkStatus || false;
  
  // Function to perform the actual API call
  const fetchPreview = async (retry = 0): Promise<any> => {
    try {
      console.log(`Sending preview request for execution ID: ${executionId}`);
      
      // Performance timer
      const timerName = 'preview_request';
      try {
        console.time(timerName);
      } catch (e) {
        // Timer might already exist, ignore
      }
      
      // Prepare the payload
      const payload = { 
        executionId,
        limit,
        checkStatus
      };
      
      console.log("Sending preview request with payload:", JSON.stringify(payload));
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke("Dataset_Preview", {
        body: payload
      });
      
      // End the performance timer
      try {
        console.timeEnd(timerName);
      } catch (e) {
        // Timer might not exist, ignore
      }
      
      if (error) {
        console.error("Error from Dataset_Preview function:", error);
        throw new Error(`Preview fetch error: ${error.message || JSON.stringify(error)}`);
      }
      
      console.log("Dataset preview response received:", data);
      
      if (!data) {
        throw new Error("Invalid response from preview function - empty response");
      }
      
      // Log the status for debugging
      console.log("Dataset preview status:", data.status);
      
      return data;
    } catch (error) {
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
