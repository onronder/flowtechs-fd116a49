
// src/api/datasets/datasetExecutionApi.ts
import { supabase } from "@/integrations/supabase/client";
import { ExportOptions, DatasetExecution } from "./datasetsApiTypes";

/**
 * Execute dataset
 */
export async function executeDataset(datasetId: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Execute",
      { body: { datasetId } }
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
      { body: { sourceId, query } }
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
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Preview",
      { body: { executionId } }
    );
    
    if (error) throw error;
    return data || { status: "error", error: "Failed to fetch preview" };
  } catch (error) {
    console.error("Error fetching dataset preview:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to fetch preview data"
    };
  }
}

/**
 * Export dataset
 */
export async function exportDataset(executionId: string, options: ExportOptions = { format: 'json' }) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Export",
      {
        body: { 
          executionId, 
          format: options.format 
        },
        headers: { 
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
    const { data, error } = await supabase
      .from("dataset_executions")
      .select(`
        *,
        dataset:dataset_id(*)
      `)
      .eq("id", executionId)
      .maybeSingle();
      
    if (error) throw error;
    return data;
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
