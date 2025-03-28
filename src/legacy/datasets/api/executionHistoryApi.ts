import { supabase } from "@/integrations/supabase/client";
import { DatasetExecution } from "../datasetsApiTypes";

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
