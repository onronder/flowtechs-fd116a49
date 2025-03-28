import { supabase } from "@/integrations/supabase/client";

export async function getDatasetExecutionData(executionId: string) {
  try {
    // Fetch the execution record first to get the status
    const { data: execution, error: executionError } = await supabase
      .from("dataset_executions")
      .select("status, data, row_count, execution_time_ms, error_message")
      .eq("id", executionId)
      .single();
      
    if (executionError) {
      console.error("Error fetching execution:", executionError);
      throw new Error(`Failed to fetch execution details: ${executionError.message}`);
    }
    
    // If the execution has data, return it
    if (execution.data) {
      return {
        status: execution.status,
        data: execution.data,
        rowCount: execution.row_count,
        executionTime: execution.execution_time_ms,
        errorMessage: execution.error_message
      };
    }
    
    // Otherwise, return the minimal information
    return {
      status: execution.status,
      data: null,
      rowCount: execution.row_count,
      executionTime: execution.execution_time_ms,
      errorMessage: execution.error_message
    };
  } catch (error) {
    console.error("Failed to get execution data:", error);
    throw error;
  }
}

export async function getLatestDatasetExecution(datasetId: string) {
  try {
    const { data, error } = await supabase
      .from("dataset_executions")
      .select("id, status, data, row_count, execution_time_ms, error_message")
      .eq("dataset_id", datasetId)
      .order("start_time", { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // This is "No rows returned" error, which is not a real error for us
        return null;
      }
      console.error("Error fetching latest execution:", error);
      throw error;
    }
    
    return {
      executionId: data.id,
      status: data.status,
      data: data.data,
      rowCount: data.row_count,
      executionTime: data.execution_time_ms,
      errorMessage: data.error_message
    };
  } catch (error) {
    console.error("Failed to get latest execution:", error);
    throw error;
  }
}
