
// Database operations for dataset executions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Updates the execution record status to running
 */
export async function markExecutionAsRunning(
  supabaseClient: any,
  executionId: string
): Promise<void> {
  const { error: updateError } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "running",
      start_time: new Date().toISOString()
    })
    .eq("id", executionId);

  if (updateError) {
    console.error("Error updating execution status:", updateError);
    throw new Error(`Error updating execution status: ${updateError.message}`);
  }
}

/**
 * Updates the execution record with success results
 */
export async function markExecutionAsCompleted(
  supabaseClient: any,
  executionId: string,
  results: any[],
  executionTime: number,
  apiCallCount: number
): Promise<void> {
  console.log(`Updating execution ${executionId} with ${results.length} rows of data`);
  console.log(`Execution time: ${executionTime}ms, API calls: ${apiCallCount}`);
  
  try {
    const { error: completeError } = await supabaseClient
      .from("dataset_executions")
      .update({
        status: "completed",
        end_time: new Date().toISOString(),
        row_count: results.length,
        execution_time_ms: executionTime,
        api_call_count: apiCallCount,
        data: results
      })
      .eq("id", executionId);

    if (completeError) {
      console.error("Error updating execution record with results:", completeError);
      throw new Error(`Failed to update execution record: ${completeError.message}`);
    }
    
    console.log(`Successfully updated execution ${executionId} with status 'completed'`);
  } catch (err) {
    console.error("Exception in markExecutionAsCompleted:", err);
    throw err;
  }
}

/**
 * Updates the execution record with failure information
 */
export async function markExecutionAsFailed(
  supabaseClient: any,
  executionId: string,
  errorMessage: string
): Promise<void> {
  console.log(`Marking execution ${executionId} as failed with error: ${errorMessage}`);
  
  try {
    const { error } = await supabaseClient
      .from("dataset_executions")
      .update({
        status: "failed",
        end_time: new Date().toISOString(),
        error_message: errorMessage || "Unknown execution error"
      })
      .eq("id", executionId);
      
    if (error) {
      console.error("Error updating failed execution status:", error);
      // Not throwing here as this is already an error handler
    }
  } catch (err) {
    console.error("Exception in markExecutionAsFailed:", err);
    // Not throwing as this is already an error handler
  }
}

/**
 * Fetches dataset and template details
 */
export async function fetchDatasetDetails(
  supabaseClient: any,
  datasetId: string,
  userId: string
) {
  console.log(`Fetching dataset details for dataset: ${datasetId}, user: ${userId}`);
  
  // First fetch the dataset
  const { data: dataset, error: datasetError } = await supabaseClient
    .from("user_datasets")
    .select(`
      *,
      source:source_id(*)
    `)
    .eq("id", datasetId)
    .eq("user_id", userId)
    .single();

  if (datasetError || !dataset) {
    console.error("Error fetching dataset:", datasetError);
    throw new Error(`Dataset error: ${datasetError?.message || "Dataset not found"}`);
  }
  
  console.log(`Found dataset: ${dataset.id}, type: ${dataset.dataset_type}`);
  
  // Fetch template directly to avoid schema issues
  let template = null;
  
  if (dataset.template_id) {
    // Try query_templates first
    const { data: queryTemplate, error: queryError } = await supabaseClient
      .from("query_templates")
      .select("*")
      .eq("id", dataset.template_id)
      .maybeSingle();
      
    if (queryTemplate) {
      console.log(`Found template in query_templates: ${queryTemplate.id}, ${queryTemplate.name}`);
      template = queryTemplate;
    } else {
      // Try dependent_query_templates if not found
      const { data: dependentTemplate } = await supabaseClient
        .from("dependent_query_templates")
        .select("*")
        .eq("id", dataset.template_id)
        .maybeSingle();
        
      if (dependentTemplate) {
        console.log(`Found template in dependent_query_templates: ${dependentTemplate.id}, ${dependentTemplate.name}`);
        template = dependentTemplate;
      } else {
        console.error(`Template not found for ID: ${dataset.template_id}`);
        console.error("Query error:", queryError?.message);
        throw new Error("Template not found");
      }
    }
  } else {
    console.log("No template ID provided in dataset");
    throw new Error("Dataset has no template_id");
  }

  return { dataset, template };
}

/**
 * Creates a Supabase client
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string
) {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    { 
      global: { 
        headers: { 
          Authorization: authHeader || "" 
        } 
      } 
    }
  );
}
