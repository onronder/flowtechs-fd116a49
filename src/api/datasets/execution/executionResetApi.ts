
import { supabase } from "@/integrations/supabase/client";

/**
 * Reset stuck executions for a specific dataset or all datasets
 * @param datasetId Optional dataset ID to reset executions for
 * @param executionId Optional specific execution ID to reset
 * @returns Object with the count of reset executions
 */
export async function resetStuckExecutions(datasetId?: string, executionId?: string) {
  try {
    console.log(`Resetting stuck executions for dataset: ${datasetId || 'all'}`);
    
    // Start building the query to find stuck executions
    let query = supabase
      .from("dataset_executions")
      .select("id, status, start_time")
      .in("status", ["pending", "running"]);
    
    // Add dataset ID filter if provided
    if (datasetId && datasetId.trim() !== '') {
      query = query.eq("dataset_id", datasetId);
    }
    
    // Add execution ID filter if provided
    if (executionId && executionId.trim() !== '') {
      query = query.eq("id", executionId);
    }
    
    // Execute the query
    const { data: stuckExecutions, error } = await query;
    
    if (error) {
      console.error("Error fetching executions:", error);
      throw error;
    }
    
    console.log(`Found ${stuckExecutions?.length || 0} stuck executions to reset`);
    
    // Now reset each execution by updating its status to 'failed'
    let resetCount = 0;
    
    for (const execution of stuckExecutions || []) {
      // Check if execution has been running for too long (30 minutes)
      const startTime = execution.start_time ? new Date(execution.start_time).getTime() : 0;
      const currentTime = new Date().getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (startTime === 0 || currentTime - startTime > thirtyMinutes) {
        const { error: updateError } = await supabase
          .from("dataset_executions")
          .update({
            status: "failed",
            end_time: new Date().toISOString(),
            error_message: "Execution was reset due to being stuck"
          })
          .eq("id", execution.id);
        
        if (updateError) {
          console.error(`Error updating execution ${execution.id}:`, updateError);
        } else {
          console.log(`Reset execution ${execution.id} from ${execution.status} to failed`);
          resetCount++;
        }
      }
    }
    
    return { resetCount };
  } catch (error) {
    console.error("Error resetting stuck executions:", error);
    throw error;
  }
}

/**
 * Reset a specific execution by ID
 * @param executionId The execution ID to reset
 * @returns Object with the result of the reset operation
 */
export async function resetSpecificExecution(executionId: string) {
  try {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }

    console.log(`Resetting specific execution: ${executionId}`);
    
    // Get the current execution status
    const { data: execution, error: fetchError } = await supabase
      .from("dataset_executions")
      .select("id, status, start_time")
      .eq("id", executionId)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching execution ${executionId}:`, fetchError);
      throw fetchError;
    }
    
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    // Update the execution status to 'failed'
    const { error: updateError } = await supabase
      .from("dataset_executions")
      .update({
        status: "failed",
        end_time: new Date().toISOString(),
        error_message: "Execution was manually reset"
      })
      .eq("id", executionId);
    
    if (updateError) {
      console.error(`Error updating execution ${executionId}:`, updateError);
      throw updateError;
    }
    
    console.log(`Successfully reset execution ${executionId} from ${execution.status} to failed`);
    
    return { success: true, message: "Execution reset successfully" };
  } catch (error) {
    console.error("Error resetting specific execution:", error);
    throw error;
  }
}
