
import { supabase } from "@/integrations/supabase/client";
import { ExportOptions, DatasetExecution } from "./datasetsApiTypes";

/**
 * Execute dataset
 */
export async function executeDataset(datasetId: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Execute",
      { 
        body: JSON.stringify({ datasetId }),
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (error) throw error;
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
    const { data, error } = await supabase.functions.invoke(
      "Cust_ExecuteDataset",
      { 
        body: JSON.stringify({ sourceId, query }),
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (error) throw error;
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
    
    if (error) throw error;
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
    const { data, error } = await supabase
      .from("dataset_executions")
      .select("*")
      .eq("dataset_id", datasetId)
      .order("start_time", { ascending: false });
      
    if (error) throw error;
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
    // Avoid complex join and fetch data separately for reliability
    const { data: execution, error: executionError } = await supabase
      .from("dataset_executions")
      .select("*")
      .eq("id", executionId)
      .maybeSingle();
      
    if (executionError) throw executionError;
    if (!execution) return null;
    
    // Fetch related dataset info
    const { data: dataset, error: datasetError } = await supabase
      .from("user_datasets")
      .select("*")
      .eq("id", execution.dataset_id)
      .maybeSingle();
    
    if (datasetError) throw datasetError;
    
    // Combine the data manually
    return {
      ...execution,
      dataset: dataset || null
    };
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
    const { data, error } = await supabase
      .from("user_storage_exports")
      .select("*")
      .eq("execution_id", executionId)
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching exports:", error);
    throw error;
  }
}
