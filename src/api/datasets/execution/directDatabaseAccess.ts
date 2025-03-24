
import { supabase } from "@/integrations/supabase/client";

/**
 * Directly fetch execution data from database when the edge function fails
 */
export async function fetchDirectExecutionData(executionId: string) {
  try {
    console.log(`[Preview] Attempting direct data fetch for execution ID: ${executionId}`);
    
    if (!executionId) {
      throw new Error("Execution ID is required");
    }
    
    // Get the current user's ID first
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error(`Authentication error: ${userError?.message || "No user found"}`);
    }
    
    // First check if the execution exists and belongs to the user
    const { data: executionCheck, error: checkError } = await supabase
      .from("dataset_executions")
      .select("id, status, dataset_id")
      .eq("id", executionId)
      .eq("user_id", user.id)
      .single();
    
    if (checkError) {
      throw new Error(`Execution check error: ${checkError.message}`);
    }
    
    // Get the execution data with correct field selection (excluding the non-existent 'error' field)
    const { data: execution, error: executionError } = await supabase
      .from("dataset_executions")
      .select(`
        id, 
        status, 
        start_time, 
        end_time, 
        row_count, 
        execution_time_ms,
        error_message,
        metadata,
        data,
        columns,
        dataset:dataset_id (id, name, dataset_type, template_id)
      `)
      .eq("id", executionId)
      .eq("user_id", user.id)
      .single();
      
    if (executionError) {
      throw new Error(`Execution data error: ${executionError.message}`);
    }
    
    if (!execution) {
      throw new Error("No execution data found");
    }
    
    // Format the data to match the edge function's response format
    const formattedData = {
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count,
        executionTimeMs: execution.execution_time_ms,
        apiCallCount: execution.metadata?.api_call_count
      },
      dataset: {
        id: execution.dataset?.id,
        name: execution.dataset?.name,
        type: execution.dataset?.dataset_type
      },
      columns: execution.columns || [],
      preview: Array.isArray(execution.data) 
        ? execution.data.slice(0, 100) 
        : [],
      totalCount: execution.row_count || 0,
      error: execution.error_message
    };
    
    console.log(`[Preview] Successfully retrieved data directly from database:`, {
      status: formattedData.status,
      columns: formattedData.columns?.length || 0,
      rows: formattedData.preview?.length || 0
    });
    
    return formattedData;
  } catch (error) {
    console.error(`[Preview] Fallback direct data fetch also failed:`, error);
    throw error;
  }
}
