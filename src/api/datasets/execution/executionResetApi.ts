
import { supabase } from "@/integrations/supabase/client";

/**
 * Reset stuck dataset executions
 * @param datasetId The dataset ID to reset executions for
 */
export async function resetStuckExecutions(datasetId: string) {
  try {
    console.log(`Resetting stuck executions for dataset: ${datasetId}`);
    
    // Find all executions in 'running' or 'pending' state that are older than 15 minutes
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
    
    const { data: stuckExecutions, error: fetchError } = await supabase
      .from("dataset_executions")
      .select("id")
      .eq("dataset_id", datasetId)
      .in("status", ["running", "pending"])
      .lt("start_time", fifteenMinutesAgo.toISOString());
      
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
    return { resetCount: stuckExecutions.length };
  } catch (error) {
    console.error("Error in resetStuckExecutions:", error);
    throw error;
  }
}
