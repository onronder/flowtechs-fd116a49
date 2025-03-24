
/**
 * Database service functions for Pre_ExecuteDataset
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Create a Supabase client
 */
export function createSupabaseClient(supabaseUrl: string, supabaseKey: string, authHeader: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
}

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

/**
 * Fetch dataset and template details
 */
export async function fetchDatasetDetails(supabaseClient: any, datasetId: string, userId: string) {
  console.log(`Fetching dataset details for datasetId: ${datasetId}, userId: ${userId}`);
  
  // First, get the dataset with its source
  const { data: dataset, error: datasetError } = await supabaseClient
    .from("user_datasets")
    .select("*, source:source_id(*)")
    .eq("id", datasetId)
    .eq("user_id", userId)
    .single();
    
  if (datasetError) {
    console.error("Dataset fetch error:", datasetError);
    throw new Error(`Dataset error: ${datasetError.message}`);
  }
  
  if (!dataset) {
    console.error("Dataset not found");
    throw new Error("Dataset not found");
  }
  
  if (!dataset.source || !dataset.source.config) {
    console.error("Source or source config not found");
    throw new Error("Missing or invalid source configuration");
  }
  
  // Now try to get the template
  let template = null;
  let templateError = null;
  
  // Try with direct query to query_templates first
  try {
    const { data: queryTemplate, error: queryError } = await supabaseClient
      .from("query_templates")
      .select("*")
      .eq("id", dataset.template_id)
      .maybeSingle();
    
    if (queryTemplate) {
      console.log("Found template in query_templates:", queryTemplate.id);
      template = queryTemplate;
    } else if (queryError) {
      console.warn("Error fetching from query_templates:", queryError);
      templateError = queryError;
    }
  } catch (error) {
    console.warn("Exception querying query_templates:", error);
  }
  
  // If not found, try dependent_query_templates
  if (!template) {
    try {
      const { data: depTemplate, error: depError } = await supabaseClient
        .from("dependent_query_templates")
        .select("*")
        .eq("id", dataset.template_id)
        .maybeSingle();
      
      if (depTemplate) {
        console.log("Found template in dependent_query_templates:", depTemplate.id);
        template = depTemplate;
      } else if (depError) {
        console.warn("Error fetching from dependent_query_templates:", depError);
        templateError = templateError || depError;
      }
    } catch (error) {
      console.warn("Exception querying dependent_query_templates:", error);
    }
  }
  
  // If template still not found, try one more approach with a simple RPC or plain SQL
  if (!template) {
    try {
      // Try with direct SQL as a last resort
      const { data, error } = await supabaseClient.rpc('get_template_by_id', { 
        template_id: dataset.template_id 
      });
      
      if (data && !error) {
        console.log("Found template using RPC:", data.id);
        template = data;
      }
    } catch (error) {
      console.warn("Exception with RPC template fetch:", error);
    }
  }
  
  // If we couldn't find the template, throw an error
  if (!template) {
    console.error("Template not found for ID:", dataset.template_id);
    const errorMsg = templateError 
      ? `Template error: ${templateError.message}` 
      : "Template not found";
    throw new Error(errorMsg);
  }
  
  return { dataset, template };
}
