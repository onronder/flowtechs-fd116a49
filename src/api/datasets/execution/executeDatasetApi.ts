
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
    const payload = JSON.stringify({ datasetId });
    
    // Log the payload we're sending
    console.log("Request payload:", payload);
    
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
    
    const token = session.access_token;
    console.log("Authentication token obtained successfully");
    
    // Invoke dataset execution with REST API instead of WebSocket
    console.log("Invoking Dataset_Execute function...");
    
    // Construct the full endpoint URL
    const endpoint = "https://sxzgeevxciuxjyxfartx.supabase.co/functions/v1/Dataset_Execute";
    console.log("Edge function endpoint:", endpoint);
    
    // Use direct fetch for more control over the request
    console.log("Sending request to edge function...");
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP error: ${response.status}`;
      try {
        const errorBody = await response.text();
        console.error("Error response from Dataset_Execute function:", response.status, errorBody);
        errorMessage = `Execution error (${response.status}): ${errorBody}`;
      } catch (textError) {
        console.error("Failed to read error response body:", textError);
      }
      throw new Error(errorMessage);
    }
    
    // Parse the response
    console.log("Parsing response...");
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse JSON response:", jsonError);
      throw new Error("Invalid response format from execution function");
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
    
    const payload = JSON.stringify({ sourceId, query });
    console.log("Request payload for custom dataset:", payload);
    
    const { data, error } = await supabase.functions.invoke(
      "Cust_ExecuteDataset",
      { 
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }
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
