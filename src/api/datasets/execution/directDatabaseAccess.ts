
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
    
    // Get the current user's session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!sessionData.session) {
      throw new Error("No active session found");
    }
    
    // First check if the execution exists and belongs to the user
    const { data: executionCheck, error: checkError } = await supabase
      .from("dataset_executions")
      .select("id, dataset_id")
      .eq("id", executionId)
      .single();
    
    if (checkError) {
      throw new Error(`Execution check error: ${checkError.message}`);
    }
    
    // Get the execution data with simplified field selection first
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
        dataset_id
      `)
      .eq("id", executionId)
      .single();
      
    if (executionError) {
      throw new Error(`Execution data error: ${executionError.message}`);
    }
    
    if (!execution) {
      throw new Error("No execution data found");
    }
    
    // Now get the dataset information separately
    const { data: dataset, error: datasetError } = await supabase
      .from("user_datasets")
      .select("id, name, dataset_type, template_id")
      .eq("id", execution.dataset_id)
      .single();
      
    if (datasetError) {
      console.warn(`Could not fetch dataset details: ${datasetError.message}`);
    }
    
    // Get API call count from metadata if it exists
    let apiCallCount: number | undefined = undefined;
    if (execution.metadata && typeof execution.metadata === 'object') {
      // Handle both possible structures of the metadata field
      if ('api_call_count' in execution.metadata) {
        apiCallCount = Number(execution.metadata.api_call_count);
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
        apiCallCount: apiCallCount
      },
      dataset: dataset ? {
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type
      } : {
        id: execution.dataset_id,
        name: "Unknown Dataset",
        type: "unknown"
      },
      columns: [], // We'll handle columns extraction from data
      preview: [],
      totalCount: execution.row_count || 0,
      error: execution.error_message
    };
    
    // Try to extract columns and preview data from the execution data (max 5 rows)
    if (execution.data && Array.isArray(execution.data) && execution.data.length > 0) {
      // Extract columns from the first row
      if (typeof execution.data[0] === 'object' && execution.data[0] !== null) {
        formattedData.columns = Object.keys(execution.data[0]).map(key => ({
          key,
          label: key
        }));
      }
      
      // Set preview data - limiting to max 5 rows for initial preview
      const maxPreviewRows = Math.min(5, execution.data.length);
      formattedData.preview = execution.data.slice(0, maxPreviewRows);
    }
    
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
