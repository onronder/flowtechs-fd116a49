
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
    
    // First, check if the user has permission to access this execution
    const { data: executionCheck, error: executionError } = await supabase
      .from("dataset_executions")
      .select("id, status, dataset_id")
      .eq("id", executionId)
      .single();
    
    if (executionError) {
      throw new Error(`Direct access error: ${executionError.message}`);
    }
    
    // Now get the full execution data including results
    let executionData;
    
    // Try to use the RPC function if available
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_execution_raw_data',
        { p_execution_id: executionId }
      );
      
      if (!rpcError && rpcData) {
        executionData = rpcData;
      }
    } catch (e) {
      console.warn("RPC fetch failed, falling back to direct query:", e);
    }
    
    // Fallback to direct query if RPC failed or not available
    if (!executionData) {
      const { data, error } = await supabase
        .from("dataset_executions")
        .select(`
          id, 
          status, 
          start_time, 
          end_time, 
          row_count, 
          execution_time_ms,
          error,
          metadata,
          data,
          columns,
          dataset:dataset_id (id, name, dataset_type, template_id)
        `)
        .eq("id", executionId)
        .single();
        
      if (error) throw error;
      executionData = data;
    }
    
    // Format the data to match the edge function's response format
    const formattedData = {
      status: executionData.status,
      execution: {
        id: executionData.id,
        startTime: executionData.start_time,
        endTime: executionData.end_time,
        rowCount: executionData.row_count,
        executionTimeMs: executionData.execution_time_ms,
        apiCallCount: executionData.metadata?.api_call_count
      },
      dataset: {
        id: executionData.dataset?.id,
        name: executionData.dataset?.name,
        type: executionData.dataset?.dataset_type
      },
      columns: executionData.columns || [],
      preview: Array.isArray(executionData.data) 
        ? executionData.data.slice(0, 100) 
        : [],
      totalCount: executionData.row_count || 0,
      error: executionData.error
    };
    
    console.log(`[Preview] Successfully retrieved data directly from database:`, formattedData);
    return formattedData;
  } catch (error) {
    console.error(`[Preview] Fallback direct data fetch also failed:`, error);
    throw error;
  }
}
