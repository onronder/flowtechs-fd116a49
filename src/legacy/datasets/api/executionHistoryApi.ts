
import { supabase } from "@/integrations/supabase/client";
import { DatasetExecution } from "../datasetsApiTypes";

export async function getDatasetExecutionHistory(datasetId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("dataset_executions")
      .select("id, status, start_time, end_time, row_count, execution_time_ms, error_message")
      .eq("dataset_id", datasetId)
      .order("start_time", { ascending: false })
      .limit(10);
      
    if (error) {
      console.error("Error fetching execution history:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Failed to get dataset execution history:", error);
    throw error;
  }
}

export async function getExecutionDetails(executionId: string): Promise<DatasetExecution | null> {
  try {
    const { data, error } = await supabase
      .from("dataset_executions")
      .select("*")
      .eq("id", executionId)
      .single();
      
    if (error) {
      console.error("Error fetching execution details:", error);
      throw error;
    }
    
    // Ensure status is cast to the correct type
    if (data) {
      return {
        ...data,
        status: data.status as DatasetExecution['status']
      };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to get execution details:", error);
    throw error;
  }
}
