
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
    
    // First, get basic execution details
    const { data: execution, error: executionError } = await supabase
      .from("dataset_executions")
      .select(`
        id, 
        status, 
        start_time, 
        end_time, 
        row_count, 
        execution_time_ms,
        error,
        metadata
      `)
      .eq("id", executionId)
      .eq("user_id", user.id)
      .single();
      
    if (executionError) {
      throw new Error(`Failed to retrieve execution: ${executionError.message}`);
    }
    
    // Get dataset details
    const { data: dataset, error: datasetError } = await supabase
      .from("user_datasets")
      .select(`
        id, 
        name, 
        dataset_type, 
        template_id
      `)
      .eq("id", execution.dataset_id)
      .eq("user_id", user.id)
      .single();
      
    if (datasetError) {
      throw new Error(`Failed to retrieve dataset: ${datasetError.message}`);
    }
    
    // Get execution data from the raw data field
    let rawData = null;
    let columns = [];
    
    // Try to use the RPC function to get the raw data
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_execution_raw_data',
        { 
          p_execution_id: executionId,
          p_user_id: user.id
        }
      );
      
      if (!rpcError && rpcData) {
        rawData = rpcData;
        
        // Extract columns from the first row if data exists
        if (Array.isArray(rawData) && rawData.length > 0) {
          columns = Object.keys(rawData[0]).map(key => ({ 
            key, 
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
          }));
        }
      }
    } catch (e) {
      console.warn("RPC fetch failed, falling back to direct query:", e);
      
      // Try to get columns directly
      const { data: columnData } = await supabase
        .from("dataset_executions")
        .select("columns")
        .eq("id", executionId)
        .eq("user_id", user.id)
        .single();
        
      if (columnData && columnData.columns) {
        columns = columnData.columns;
      }
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
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type
      },
      columns: columns,
      preview: Array.isArray(rawData) ? rawData.slice(0, 100) : [],
      totalCount: execution.row_count || 0,
      error: execution.error
    };
    
    console.log(`[Preview] Successfully retrieved data directly from database:`, formattedData);
    return formattedData;
  } catch (error) {
    console.error(`[Preview] Fallback direct data fetch failed:`, error);
    throw error;
  }
}
