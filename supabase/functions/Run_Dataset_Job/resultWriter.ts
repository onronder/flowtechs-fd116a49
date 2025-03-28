
import { supabase } from "./_shared/supabaseClient.ts";
import { ExecutionResultParams } from "./types.ts";

export async function writeExecutionResult(params: ExecutionResultParams): Promise<void> {
  const { 
    datasetId, 
    executionId, 
    result, 
    rowCount, 
    executionTime, 
    status 
  } = params;
  
  console.log(`Writing execution result for execution ID: ${executionId}`);
  
  try {
    // Update the execution record with results
    const { error: updateError } = await supabase
      .from("dataset_executions")
      .update({
        status,
        end_time: new Date().toISOString(),
        data: result,
        row_count: rowCount,
        execution_time_ms: executionTime
      })
      .eq("id", executionId);
    
    if (updateError) {
      console.error("Error updating execution record:", updateError);
      throw new Error(`Failed to update execution: ${updateError.message}`);
    }
    
    // Also update the dataset's last execution reference
    const { error: datasetError } = await supabase
      .from("user_datasets")
      .update({
        last_execution_id: executionId,
        last_execution_time: new Date().toISOString(),
        last_execution_status: status,
        last_row_count: rowCount
      })
      .eq("id", datasetId);
    
    if (datasetError) {
      console.error("Error updating dataset last execution:", datasetError);
      // Don't throw, as the execution itself was successful
    }
    
    console.log(`Successfully wrote execution results for execution ID: ${executionId}`);
  } catch (error) {
    console.error("Error writing execution result:", error);
    throw error;
  }
}
