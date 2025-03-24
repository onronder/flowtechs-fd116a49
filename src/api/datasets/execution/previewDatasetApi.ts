
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
        // Call the edge function with timeout handling
        const functionPromise = supabase.functions.invoke("Dataset_Preview", {
          body: payload
        });
        
        // Set up timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Preview request timed out after 30 seconds")), 30000);
        });
        
        // Race between the function call and the timeout
        const result = await Promise.race([functionPromise, timeoutPromise]) as { data: any, error: any };
        
        if (result.error) {
          console.error("Error from Dataset_Preview function:", result.error);
          throw new Error(`Preview fetch error: ${result.error.message || JSON.stringify(result.error)}`);
        }
        
        if (!result.data) {
          throw new Error("Invalid response from preview function - empty response");
        }
        
        // Log the status and other important details
        console.log(`Dataset preview response: status=${result.data.status}, rows=${result.data.preview?.length || 0}, totalCount=${result.data.totalCount || 0}`);
        
        return result.data;
      } catch (fetchError) {
        throw fetchError;
      }
    } catch (error) {
      if ((error as Error).message.includes("timed out")) {
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
