import { supabase } from "@/integrations/supabase/client";
import { ExportOptions, DatasetExecution } from "./datasetsApiTypes";

/**
 * Execute dataset
 */
export async function executeDataset(datasetId: string) {
  try {
    // Add extensive logging
    console.log(`Executing dataset with ID: ${datasetId}`);
    
    if (!datasetId || typeof datasetId !== 'string') {
      console.error("Invalid datasetId provided:", datasetId);
      throw new Error("A valid dataset ID is required");
    }
    
    // Create the payload as a plain object without stringifying
    const payload = { datasetId };
    
    // Log the payload we're sending
    console.log("Request payload:", payload);
    
    // Pass the payload object directly without stringify
    console.log("Invoking Dataset_Execute function with direct object payload...");
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Execute",
      { 
        body: payload, // Passing as plain object
        headers: { 
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (error) {
      console.error("Error from Dataset_Execute function:", error);
      throw error;
    }
    
    console.log("Dataset execution response:", data);
    return data;
  } catch (error) {
    console.error("Error executing dataset:", error);
    throw error;
  }
}

/**
 * Execute custom dataset (direct query execution)
 */
export async function executeCustomDataset(sourceId: string, query: string) {
  try {
    console.log(`Executing custom dataset query for source ID: ${sourceId}`);
    const payload = JSON.stringify({ sourceId, query });
    
    const { data, error } = await supabase.functions.invoke(
      "Cust_ExecuteDataset",
      { 
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (error) {
      console.error("Error from Cust_ExecuteDataset function:", error);
      throw error;
    }
    
    console.log("Custom dataset execution response:", data);
    return data;
  } catch (error) {
    console.error("Error executing custom dataset:", error);
    throw error;
  }
}

/**
 * Fetch dataset preview
 */
export async function fetchDatasetPreview(executionId: string) {
  try {
    console.log(`Sending preview request for execution ID: ${executionId}`);
    
    // Explicitly stringify the payload
    const payload = JSON.stringify({ executionId });
    console.log("Sending preview request with payload:", payload);
    
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Preview",
      { 
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (error) {
      console.error("Error fetching dataset preview:", error);
      throw error;
    }
    
    if (!data) {
      throw new Error("No data returned from preview function");
    }
    
    console.log("Dataset preview response received:", data);
    return data;
  } catch (error) {
    console.error("Error fetching dataset preview:", error);
    throw error;
  }
}

/**
 * Export dataset
 */
export async function exportDataset(executionId: string, options: ExportOptions = { format: 'json' }) {
  try {
    console.log(`Exporting dataset for execution ID: ${executionId}, format: ${options.format}`);
    
    const payload = JSON.stringify({ 
      executionId, 
      format: options.format 
    });
    
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Export",
      {
        body: payload,
        headers: { 
          'Content-Type': 'application/json',
          'Save-To-Storage': options.saveToStorage ? 'true' : 'false' 
        }
      }
    );
    
    if (error) {
      console.error("Error exporting dataset:", error);
      throw error;
    }
    
    console.log("Dataset export response:", data);
    return data;
  } catch (error) {
    console.error("Error exporting dataset:", error);
    throw error;
  }
}

/**
 * Get dataset execution history
 */
export async function getDatasetExecutionHistory(datasetId: string) {
  try {
    console.log(`Fetching execution history for dataset ID: ${datasetId}`);
    
    const { data, error } = await supabase
      .from("dataset_executions")
      .select("*")
      .eq("dataset_id", datasetId)
      .order("start_time", { ascending: false });
      
    if (error) {
      console.error("Error fetching execution history:", error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} execution records`);
    return data;
  } catch (error) {
    console.error("Error fetching execution history:", error);
    throw error;
  }
}

/**
 * Get dataset execution details
 */
export async function getExecutionDetails(executionId: string): Promise<DatasetExecution | null> {
  try {
    console.log(`Fetching execution details for ID: ${executionId}`);
    
    // Avoid complex join and fetch data separately for reliability
    const { data: execution, error: executionError } = await supabase
      .from("dataset_executions")
      .select("*")
      .eq("id", executionId)
      .maybeSingle();
      
    if (executionError) {
      console.error("Error fetching execution details:", executionError);
      throw executionError;
    }
    
    if (!execution) {
      console.log(`No execution found for ID: ${executionId}`);
      return null;
    }
    
    // Fetch related dataset info
    const { data: dataset, error: datasetError } = await supabase
      .from("user_datasets")
      .select("*")
      .eq("id", execution.dataset_id)
      .maybeSingle();
    
    if (datasetError) {
      console.error("Error fetching dataset details:", datasetError);
      throw datasetError;
    }
    
    // Combine the data manually
    const result = {
      ...execution,
      dataset: dataset || null
    };
    
    console.log(`Retrieved execution details for ID: ${executionId}`);
    return result;
  } catch (error) {
    console.error("Error fetching execution details:", error);
    return null;
  }
}

/**
 * Get dataset exports
 */
export async function getDatasetExports(executionId: string) {
  try {
    console.log(`Fetching exports for execution ID: ${executionId}`);
    
    const { data, error } = await supabase
      .from("user_storage_exports")
      .select("*")
      .eq("execution_id", executionId)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching exports:", error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} export records`);
    return data;
  } catch (error) {
    console.error("Error fetching exports:", error);
    throw error;
  }
}
