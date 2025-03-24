
import { supabase } from "@/integrations/supabase/client";

/**
 * Execute dataset with improved error handling
 */
export async function executeDataset(datasetId: string) {
  try {
    // Add extensive logging
    console.log(`Executing dataset with ID: ${datasetId}`);
    
    if (!datasetId || typeof datasetId !== 'string') {
      console.error("Invalid datasetId provided:", datasetId);
      throw new Error("A valid dataset ID is required");
    }
    
    // Create the payload with the dataset ID
    const payload = { datasetId };
    
    // Log the payload we're sending
    console.log("Request payload:", JSON.stringify(payload));
    
    // Check authentication status first
    console.log("Checking authentication...");
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error("Authentication error:", authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }
    
    if (!session) {
      console.error("No active session found");
      throw new Error("Authentication required to execute dataset. Please sign in.");
    }
    
    console.log("Authentication token obtained successfully");
    
    // Use supabase.functions.invoke instead of direct fetch
    console.log("Invoking Dataset_Execute function via supabase client...");
    const { data, error } = await supabase.functions.invoke("Dataset_Execute", {
      body: payload,
    });
    
    if (error) {
      console.error("Error from Dataset_Execute function:", error);
      throw new Error(`Execution error: ${error.message || JSON.stringify(error)}`);
    }
    
    // Validate the response format
    if (!data || !data.executionId) {
      console.error("Invalid response format:", data);
      throw new Error("Invalid response from execution function - missing executionId");
    }
    
    console.log("Dataset execution response:", data);
    return data;
  } catch (error) {
    console.error("Error executing dataset:", error);
    
    // Enhance the error with more details
    const enhancedError = error instanceof Error 
      ? new Error(`Dataset execution failed: ${error.message}`)
      : new Error(`Dataset execution failed: ${JSON.stringify(error)}`);
      
    throw enhancedError;
  }
}

/**
 * Execute custom dataset (direct query execution)
 */
export async function executeCustomDataset(sourceId: string, query: string) {
  try {
    console.log(`Executing custom dataset query for source ID: ${sourceId}`);
    
    if (!sourceId || typeof sourceId !== 'string') {
      console.error("Invalid sourceId provided:", sourceId);
      throw new Error("A valid source ID is required");
    }
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.error("Invalid query provided:", query);
      throw new Error("A valid query is required");
    }
    
    const payload = { sourceId, query };
    console.log("Request payload for custom dataset:", JSON.stringify(payload));
    
    const { data, error } = await supabase.functions.invoke(
      "Cust_ExecuteDataset", 
      { body: payload }
    );
    
    if (error) {
      console.error("Error from Cust_ExecuteDataset function:", error);
      throw new Error(`Execution error: ${error.message || JSON.stringify(error)}`);
    }
    
    console.log("Custom dataset execution response:", data);
    return data;
  } catch (error) {
    console.error("Error executing custom dataset:", error);
    
    // Enhance the error with more details
    const enhancedError = error instanceof Error 
      ? new Error(`Custom dataset execution failed: ${error.message}`)
      : new Error(`Custom dataset execution failed: ${JSON.stringify(error)}`);
      
    throw enhancedError;
  }
}
