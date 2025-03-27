
import { supabase } from "@/integrations/supabase/client";
import { ShopifyCredentials } from "@/types/sourceTypes";

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
    
    // Safely extract source credentials
    let sourceCredentials: ShopifyCredentials | undefined;
    
    if (dataset.source && dataset.source.config) {
      const config = dataset.source.config;
      
      // Check if config is a proper object with credentials
      if (typeof config === 'object' && config !== null) {
        sourceCredentials = {
          storeName: String(config.storeName || ''),
          clientId: String(config.clientId || ''),
          apiSecret: String(config.apiSecret || ''),
          accessToken: String(config.accessToken || ''),
          api_version: String(config.api_version || '')
        };
        
        console.log("Source credentials extracted:", {
          storeName: sourceCredentials.storeName,
          hasClientId: !!sourceCredentials.clientId,
          hasApiSecret: !!sourceCredentials.apiSecret,
          hasAccessToken: !!sourceCredentials.accessToken,
          apiVersion: sourceCredentials.api_version
        });
      } else {
        console.error("Invalid source config format:", config);
      }
    }
    
    // Create the payload with the dataset ID and source credentials if needed
    const payload = { 
      datasetId,
      sourceCredentials: sourceCredentials
    };
    
    // Log the payload we're sending (without sensitive data)
    console.log("Request payload:", {
      datasetId: payload.datasetId,
      sourceCredentials: sourceCredentials ? {
        storeName: sourceCredentials.storeName,
        hasClientId: !!sourceCredentials.clientId,
        hasApiSecret: !!sourceCredentials.apiSecret,
        hasAccessToken: !!sourceCredentials.accessToken,
        apiVersion: sourceCredentials.api_version
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
    
    // Safely extract source credentials
    let sourceCredentials: ShopifyCredentials | undefined;
    
    if (source && source.config) {
      const config = source.config;
      
      // Check if config is a proper object with credentials
      if (typeof config === 'object' && config !== null) {
        sourceCredentials = {
          storeName: String(config.storeName || ''),
          clientId: String(config.clientId || ''),
          apiSecret: String(config.apiSecret || ''),
          accessToken: String(config.accessToken || ''),
          api_version: String(config.api_version || '')
        };
      } else {
        console.error("Invalid source config format:", config);
      }
    }
    
    const payload = { 
      sourceId, 
      query,
      sourceCredentials: sourceCredentials
    };
    
    console.log("Request payload for custom dataset:", {
      sourceId: payload.sourceId,
      queryLength: payload.query.length,
      sourceCredentials: sourceCredentials ? { 
        storeName: sourceCredentials.storeName,
        hasClientId: !!sourceCredentials.clientId,
        hasApiSecret: !!sourceCredentials.apiSecret,
        hasAccessToken: !!sourceCredentials.accessToken,
        apiVersion: sourceCredentials.api_version
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
