
import { supabase } from "@/integrations/supabase/client";

/**
 * Reset stuck dataset executions
 * @param datasetId The dataset ID to reset executions for
 * @param specificExecutionId Optional specific execution ID to reset
 */
export async function resetStuckExecutions(datasetId: string, specificExecutionId?: string) {
  try {
    console.log(`Resetting stuck executions for dataset: ${datasetId}`);
    
    // Find all executions in 'running' or 'pending' state that are older than 10 minutes
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
    
    let query = supabase
      .from("dataset_executions")
      .select("id")
      .in("status", ["running", "pending"]);
      
    // If a specific execution ID is provided, use that instead of the time-based filter
    if (specificExecutionId) {
      query = query.eq("id", specificExecutionId);
    } else {
      query = query
        .eq("dataset_id", datasetId)
        .lt("start_time", tenMinutesAgo.toISOString());
    }
    
    const { data: stuckExecutions, error: fetchError } = await query;
      
    if (fetchError) {
      console.error("Error fetching stuck executions:", fetchError);
      throw fetchError;
    }
    
    if (!stuckExecutions || stuckExecutions.length === 0) {
      console.log("No stuck executions found");
      return { resetCount: 0 };
    }
    
    console.log(`Found ${stuckExecutions.length} stuck executions to reset`);
    
    // Update all stuck executions to 'failed' state
    const stuckIds = stuckExecutions.map(exec => exec.id);
    
    const { error: updateError } = await supabase
      .from("dataset_executions")
      .update({ 
        status: "failed", 
        end_time: new Date().toISOString(),
        error_message: "Execution timed out and was automatically reset" 
      })
      .in("id", stuckIds);
      
    if (updateError) {
      console.error("Error updating stuck executions:", updateError);
      throw updateError;
    }
    
    console.log(`Successfully reset ${stuckExecutions.length} stuck executions`);
    return { resetCount: stuckExecutions.length, resetIds: stuckIds };
  } catch (error) {
    console.error("Error in resetStuckExecutions:", error);
    throw error;
  }
}

/**
 * Reset a specific execution that is stuck
 */
export async function resetSpecificExecution(executionId: string) {
  try {
    console.log(`Attempting to reset specific execution: ${executionId}`);
    
    const { resetCount, resetIds } = await resetStuckExecutions("", executionId);
    
    return { 
      success: resetCount > 0,
      message: resetCount > 0 
        ? `Successfully reset execution ${executionId}` 
        : `No execution found with ID ${executionId} that needs resetting`
    };
  } catch (error) {
    console.error("Error resetting specific execution:", error);
    throw error;
  }
}
