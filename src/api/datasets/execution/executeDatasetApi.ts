
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
    
    // Invoke dataset execution with REST API instead of WebSocket
    console.log("Invoking Dataset_Execute function...");
    
    // Get the current auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    if (!token) {
      throw new Error("Authentication required to execute dataset");
    }
    
    // Use direct fetch for more control over the request
    const response = await fetch("https://sxzgeevxciuxjyxfartx.supabase.co/functions/v1/Dataset_Execute", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from Dataset_Execute function:", response.status, errorText);
      throw new Error(`Execution error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
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
