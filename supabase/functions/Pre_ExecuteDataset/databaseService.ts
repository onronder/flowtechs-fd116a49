
/**
 * Database service functions for Pre_ExecuteDataset
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

/**
 * Create Supabase client
 */
export function createSupabaseClient(url: string, key: string, authHeader?: string) {
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  };

  if (authHeader) {
    options.global.headers['Authorization'] = authHeader;
  }

  return createClient(url, key, options);
}

/**
 * Update execution status to running
 */
export async function markExecutionAsRunning(supabaseClient: any, executionId: string) {
  const { error } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "running",
      start_time: new Date().toISOString(),
      data: null,
      error_message: null
    })
    .eq("id", executionId);

  if (error) {
    console.error("Error marking execution as running:", error);
    throw error;
  }
}

/**
 * Update execution status to completed with results
 */
export async function markExecutionAsCompleted(
  supabaseClient: any,
  executionId: string,
  results: any[],
  executionTime: number,
  apiCallCount: number
) {
  const { error } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "completed",
      end_time: new Date().toISOString(),
      data: results,
      row_count: results.length,
      execution_time_ms: executionTime,
      api_call_count: apiCallCount
    })
    .eq("id", executionId);

  if (error) {
    console.error("Error marking execution as completed:", error);
    throw error;
  }
}

/**
 * Update execution status to failed with error message
 */
export async function markExecutionAsFailed(
  supabaseClient: any,
  executionId: string,
  errorMessage: string
) {
  const { error } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "failed",
      end_time: new Date().toISOString(),
      error_message: errorMessage
    })
    .eq("id", executionId);

  if (error) {
    console.error("Error marking execution as failed:", error);
    throw error;
  }
}

/**
 * Fetch dataset and template details
 */
export async function fetchDatasetDetails(supabaseClient: any, datasetId: string, userId: string) {
  // Fetch dataset with source joined
  const { data: dataset, error: datasetError } = await supabaseClient
    .from("user_datasets")
    .select("*, source:source_id(*)")
    .eq("id", datasetId)
    .eq("user_id", userId)
    .single();

  if (datasetError) {
    console.error("Error fetching dataset:", datasetError);
    throw new Error(`Error fetching dataset: ${datasetError.message}`);
  }

  if (!dataset) {
    throw new Error(`Dataset not found for ID: ${datasetId}`);
  }

  // If no template ID, don't try to fetch template
  if (!dataset.template_id) {
    return { dataset, template: null };
  }

  // Try to fetch template from query_templates first
  const { data: template, error: templateError } = await supabaseClient
    .from("query_templates")
    .select("*")
    .eq("id", dataset.template_id)
    .maybeSingle();

  if (templateError) {
    console.error("Error fetching template:", templateError);
    throw new Error(`Error fetching template: ${templateError.message}`);
  }

  // If found in query_templates, return it
  if (template) {
    return { dataset, template };
  }

  // If not found in query_templates, try dependent_query_templates
  const { data: dependentTemplate, error: dependentError } = await supabaseClient
    .from("dependent_query_templates")
    .select("*")
    .eq("id", dataset.template_id)
    .maybeSingle();

  if (dependentError) {
    console.error("Error fetching dependent template:", dependentError);
    throw new Error(`Error fetching dependent template: ${dependentError.message}`);
  }

  return { dataset, template: dependentTemplate };
}

/**
 * Log errors to audit_logs table for better debugging
 */
export async function logErrorToAuditLogs(
  supabaseClient: any,
  userId: string,
  datasetId: string,
  executionId: string,
  action: string,
  details: any
) {
  try {
    const { error } = await supabaseClient
      .from("audit_logs")
      .insert({
        user_id: userId,
        resource_id: datasetId,
        resource_type: "dataset_execution",
        action: action,
        details: {
          ...details,
          executionId,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error("Error logging to audit_logs:", error);
    }
  } catch (e) {
    console.error("Failed to log to audit_logs:", e);
    // Don't throw here - we don't want to fail the main operation
  }
}
