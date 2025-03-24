
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
      console.log(`[Preview] Attempting to fetch data from Dataset_Preview edge function`);
      console.log(`Sending preview request for execution ID: ${executionId}, retry: ${retry}`);
      
      // Generate a unique request ID for tracing purposes
      const requestId = `${executionId}_${Date.now()}`;
      
      // Prepare the payload
      const payload = { 
        executionId,
        limit, // Explicitly limit the data to reduce exposure of sensitive info
        checkStatus,
        // Signal to the edge function to exclude sensitive data
        secureMode: true,
        requestId
      };
      
      console.log("Sending preview request with payload:", JSON.stringify(payload));
      
      try {
        // Start a timer for performance tracking
        const timerName = `preview_request_${requestId}`;
        console.time(timerName);
        
        // Call the edge function
        const { data, error } = await supabase.functions.invoke("Dataset_Preview", {
          body: payload
        });
        
        // End the timer
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
        console.log(`[Preview] Preview data received successfully from edge function`);
        
        return data;
      } catch (fetchError) {
        throw fetchError;
      }
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
