
/**
 * Service for handling dataset execution status updates
 */

/**
 * Mark an execution as running
 */
export async function markExecutionAsRunning(supabaseClient: any, executionId: string) {
  console.log(`Marking execution ${executionId} as running`);
  
  const { error } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "running",
      start_time: new Date().toISOString(),
      metadata: { started_at: new Date().toISOString() }
    })
    .eq("id", executionId);

  if (error) {
    console.error("Error marking execution as running:", error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Mark an execution as completed
 */
export async function markExecutionAsCompleted(
  supabaseClient: any, 
  executionId: string, 
  results: any[], 
  executionTime: number,
  apiCallCount: number
) {
  console.log(`Marking execution ${executionId} as completed with ${results.length} rows`);
  
  const metadata = {
    completed_at: new Date().toISOString(),
    execution_time_ms: executionTime,
    api_call_count: apiCallCount
  };
  
  // Generate column definitions from the first result
  const columns = results.length > 0 
    ? Object.keys(results[0]).map(key => ({ 
        key, 
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      })) 
    : [];
  
  const { error } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "completed",
      end_time: new Date().toISOString(),
      row_count: results.length,
      execution_time_ms: executionTime,
      metadata: metadata,
      data: results,
      columns: columns
    })
    .eq("id", executionId);
  
  if (error) {
    console.error("Error marking execution as completed:", error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  // Also update the parent dataset with the last execution details
  const { error: datasetError } = await supabaseClient
    .from("user_datasets")
    .update({
      last_execution_id: executionId,
      last_execution_time: new Date().toISOString(),
      last_row_count: results.length
    })
    .eq("id", (await supabaseClient.from("dataset_executions").select("dataset_id").eq("id", executionId).single()).data.dataset_id);
  
  if (datasetError) {
    console.warn("Error updating dataset with execution details:", datasetError);
    // Non-fatal error, continue execution
  }
}

/**
 * Mark an execution as failed
 */
export async function markExecutionAsFailed(supabaseClient: any, executionId: string, errorMessage: string) {
  console.log(`Marking execution ${executionId} as failed: ${errorMessage}`);
  
  const { error } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "failed",
      end_time: new Date().toISOString(),
      metadata: { 
        failed_at: new Date().toISOString(),
        error: errorMessage
      },
      error: errorMessage
    })
    .eq("id", executionId);

  if (error) {
    console.error("Error marking execution as failed:", error);
    throw new Error(`Database error: ${error.message}`);
  }
}
