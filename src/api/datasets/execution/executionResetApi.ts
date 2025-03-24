
import { supabase } from "@/integrations/supabase/client";

/**
 * Reset stuck executions for a dataset
 * @param datasetId The dataset ID to check for stuck executions
 * @param specificExecutionId Optional specific execution ID to reset
 */
export async function resetStuckExecutions(datasetId: string, specificExecutionId?: string) {
  try {
    console.log(`Resetting stuck executions for dataset: ${datasetId}`);
    
    // Query to find stuck executions (pending or running for more than 15 minutes)
    let query = supabase
      .from('dataset_executions')
      .select('id, status, start_time')
      .eq('dataset_id', datasetId)
      .in('status', ['pending', 'running']);
      
    // If a specific execution ID is provided, only check that one
    if (specificExecutionId) {
      query = query.eq('id', specificExecutionId);
    }
    
    const { data: executions, error } = await query;
    
    if (error) {
      console.error("Error fetching executions:", error);
      throw error;
    }
    
    // Filter executions that started more than 15 minutes ago
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
    
    const stuckExecutions = executions.filter(execution => {
      const startTime = new Date(execution.start_time);
      return startTime < fifteenMinutesAgo;
    });
    
    console.log(`Found ${stuckExecutions.length} stuck executions`);
    
    if (stuckExecutions.length === 0) {
      console.log("No stuck executions found");
      return { resetCount: 0, message: "No stuck executions found" };
    }
    
    // Reset each stuck execution
    for (const execution of stuckExecutions) {
      await supabase
        .from('dataset_executions')
        .update({
          status: 'failed',
          error_message: 'Execution timed out and was automatically reset',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', execution.id);
        
      console.log(`Reset execution: ${execution.id}`);
    }
    
    return { 
      resetCount: stuckExecutions.length,
      message: `Reset ${stuckExecutions.length} stuck execution(s)`
    };
  } catch (error) {
    console.error("Error resetting stuck executions:", error);
    throw error;
  }
}

/**
 * Reset a specific execution that appears to be stuck
 */
export async function resetSpecificExecution(executionId: string) {
  try {
    console.log(`Attempting to reset execution: ${executionId}`);
    
    // First check if the execution is actually stuck
    const { data: execution, error } = await supabase
      .from('dataset_executions')
      .select('id, status, start_time, dataset_id')
      .eq('id', executionId)
      .single();
      
    if (error) {
      console.error("Error fetching execution:", error);
      throw error;
    }
    
    // Only reset if the execution is in a pending or running state
    if (!execution || !['pending', 'running'].includes(execution.status)) {
      return { 
        success: false, 
        message: "Execution is not in a pending or running state and doesn't need to be reset"
      };
    }
    
    // Check if it's been running for at least 5 minutes
    const startTime = new Date(execution.start_time);
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    if (startTime > fiveMinutesAgo) {
      return { 
        success: false, 
        message: "Execution hasn't been running long enough to be considered stuck"
      };
    }
    
    // Reset the execution
    const { error: updateError } = await supabase
      .from('dataset_executions')
      .update({
        status: 'failed',
        error_message: 'Execution manually reset by user',
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId);
      
    if (updateError) {
      console.error("Error updating execution:", updateError);
      throw updateError;
    }
    
    console.log(`Successfully reset execution: ${executionId}`);
    
    return { 
      success: true, 
      message: "Execution reset successfully",
      datasetId: execution.dataset_id
    };
  } catch (error) {
    console.error("Error resetting execution:", error);
    throw error;
  }
}
