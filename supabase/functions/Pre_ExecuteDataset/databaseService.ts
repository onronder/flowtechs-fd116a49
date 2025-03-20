
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
}

/**
 * Updates the execution record with failure information
 */
export async function markExecutionAsFailed(
  supabaseClient: any,
  executionId: string,
  errorMessage: string
): Promise<void> {
  await supabaseClient
    .from("dataset_executions")
    .update({
      status: "failed",
      end_time: new Date().toISOString(),
      error_message: errorMessage || "Unknown execution error"
    })
    .eq("id", executionId);
}

/**
 * Fetches dataset and template details
 */
export async function fetchDatasetDetails(
  supabaseClient: any,
  datasetId: string,
  userId: string
) {
  const { data: dataset, error: datasetError } = await supabaseClient
    .from("user_datasets")
    .select(`
      *,
      source:source_id(*),
      template:template_id(*)
    `)
    .eq("id", datasetId)
    .eq("user_id", userId)
    .single();

  if (datasetError || !dataset) {
    throw new Error(`Dataset error: ${datasetError?.message || "Dataset not found"}`);
  }

  // Get the template
  const template = dataset.template;
  if (!template) {
    throw new Error("Template not found");
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
