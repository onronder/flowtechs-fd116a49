
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { errorResponse } from "./responseUtils.ts";
import { getSupabaseClient } from "./supabaseClient.ts";

/**
 * Fetches execution details
 * @param req The request object
 * @param executionId The execution ID to fetch
 * @param limit Maximum number of rows to return in preview
 * @returns Execution details response
 */
export async function fetchExecutionDetails(req: Request, executionId: string, limit: number) {
  // Create Supabase client
  const supabase = await getSupabaseClient(req);
  
  // Verify that execution exists
  const { data: executionCheck, error: executionError } = await supabase
    .from("dataset_executions")
    .select("id, user_id")
    .eq("id", executionId)
    .maybeSingle();

  if (executionError) {
    console.error("Error checking execution:", executionError);
    throw new Error(`Database error: ${executionError.message}`);
  }

  if (!executionCheck) {
    console.error("Execution not found");
    throw new Error("Execution not found");
  }

  // Now get the execution data
  // Modified query to avoid the template join that was causing issues
  const { data: execution, error: fetchError } = await supabase
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

  if (fetchError) {
    console.error("Error fetching execution:", fetchError);
    throw new Error(`Database error: ${fetchError.message}`);
  }

  // Now fetch the dataset information separately to avoid join issues
  const datasetInfo = await fetchDatasetInfo(supabase, execution.dataset_id);

  // Format response based on execution status
  return formatResponse(execution, datasetInfo, limit);
}

/**
 * Fetches dataset information
 * @param supabase Supabase client
 * @param datasetId Dataset ID
 * @returns Dataset information
 */
async function fetchDatasetInfo(supabase: any, datasetId: string) {
  const { data: dataset, error: datasetError } = await supabase
    .from("user_datasets")
    .select("id, name, dataset_type, template_id")
    .eq("id", datasetId)
    .single();

  // Build dataset info object safely
  const datasetInfo = {
    id: dataset?.id || datasetId,
    name: dataset?.name || "Unknown Dataset",
    type: dataset?.dataset_type || "unknown",
    template: null // Initialize with null
  };

  // Only try to get template info if we have a template_id and avoid direct joins
  if (dataset?.template_id) {
    // Try query_templates first
    const { data: templateData } = await supabase
      .from("query_templates")
      .select("id, name")
      .eq("id", dataset.template_id)
      .maybeSingle();
      
    if (templateData) {
      datasetInfo.template = { name: templateData.name };
    } else {
      // Try dependent_query_templates if not found in query_templates
      const { data: depTemplateData } = await supabase
        .from("dependent_query_templates")
        .select("id, name")
        .eq("id", dataset.template_id)
        .maybeSingle();
        
      if (depTemplateData) {
        datasetInfo.template = { name: depTemplateData.name };
      }
    }
  }

  return datasetInfo;
}

/**
 * Formats the response based on execution status
 * @param execution Execution data
 * @param datasetInfo Dataset information
 * @param limit Maximum number of rows to return in preview
 * @returns Formatted response
 */
function formatResponse(execution: any, datasetInfo: any, limit: number) {
  const response: Record<string, any> = {
    status: execution.status,
    execution: {
      id: execution.id,
      startTime: execution.start_time,
      endTime: execution.end_time,
      rowCount: execution.row_count,
      executionTimeMs: execution.execution_time_ms,
      apiCallCount: execution.metadata?.api_call_count
    },
    dataset: datasetInfo,
    columns: [],
    error: execution.error_message
  };

  // Handle different execution states
  if (execution.status === "completed") {
    // Extract columns from data if available
    if (execution.data && Array.isArray(execution.data) && execution.data.length > 0) {
      const firstRow = execution.data[0];
      if (typeof firstRow === 'object' && firstRow !== null) {
        response.columns = Object.keys(firstRow).map(key => ({
          key,
          label: key
        }));
      }
    }

    // Set preview data - limiting to max 5 rows for initial preview
    const maxPreviewRows = Math.min(5, limit);
    response.preview = Array.isArray(execution.data) 
      ? execution.data.slice(0, maxPreviewRows) 
      : [];
    
    response.totalCount = execution.row_count || 0;
  } else {
    // Pending or running
    response.preview = [];
    response.totalCount = 0;
  }

  return response;
}
