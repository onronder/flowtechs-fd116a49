
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
    
    // Check authentication status first
    console.log("Checking authentication...");
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error("Authentication error or no session:", authError);
      throw new Error("Authentication required to execute dataset. Please sign in.");
    }
    
    console.log("Authentication token obtained successfully");
    
    // Get the dataset to check its type
    const { data: dataset, error: datasetError } = await supabase
      .from("user_datasets")
      .select("*, source:source_id(*)")
      .eq("id", datasetId)
      .single();
      
    if (datasetError) {
      console.error("Error fetching dataset details:", datasetError);
      throw new Error(`Failed to fetch dataset details: ${datasetError.message}`);
    }
    
    console.log("Dataset details retrieved:", {
      id: dataset.id,
      name: dataset.name,
      type: dataset.dataset_type,
      hasSource: !!dataset.source,
      sourceType: dataset.source?.source_type
    });
    
    // Create the payload with the dataset ID and source credentials if needed
    const payload = { 
      datasetId,
      sourceCredentials: dataset.source?.config
    };
    
    // Log the payload we're sending (without sensitive data)
    console.log("Request payload:", {
      ...payload, 
      sourceCredentials: dataset.source ? 
        { 
          storeName: dataset.source.config.storeName,
          hasAccessToken: !!dataset.source.config.accessToken,
          hasApiSecret: !!dataset.source.config.apiSecret
        } : null
    });
    
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
    
    // Check authentication status first
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error("Authentication error or no session:", authError);
      throw new Error("Authentication required to execute custom dataset. Please sign in.");
    }
    
    // Get the source to retrieve credentials
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
      
    if (sourceError) {
      console.error("Error fetching source details:", sourceError);
      throw new Error(`Failed to fetch source details: ${sourceError.message}`);
    }
    
    const payload = { 
      sourceId, 
      query,
      sourceCredentials: source.config
    };
    console.log("Request payload for custom dataset:", {
      ...payload,
      sourceCredentials: source ? 
        { 
          storeName: source.config.storeName,
          hasAccessToken: !!source.config.accessToken,
          hasApiSecret: !!source.config.apiSecret
        } : null
    });
    
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
