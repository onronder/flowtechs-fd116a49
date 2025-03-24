
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ExecutionData, ExecutionResults } from "./types.ts";

/**
 * Creates and returns a Supabase admin client
 * @returns Supabase admin client
 */
export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

/**
 * Fetches execution data from the database
 * @param supabaseAdmin Supabase admin client
 * @param executionId Execution ID
 * @returns Execution data or throws error
 */
export async function getExecutionData(supabaseAdmin: any, executionId: string): Promise<ExecutionData> {
  const { data, error } = await supabaseAdmin
    .from("dataset_executions")
    .select(`
      id,
      dataset_id,
      status,
      start_time,
      end_time,
      row_count,
      execution_time_ms,
      api_call_count,
      dataset:dataset_id(name, user_id)
    `)
    .eq("id", executionId)
    .single();

  if (error || !data) {
    console.error("Execution not found or error:", error);
    throw new Error(error?.message || "Execution not found");
  }

  return data;
}

/**
 * Fetches execution results from the database
 * @param supabaseAdmin Supabase admin client
 * @param executionId Execution ID
 * @returns Execution results or throws error
 */
export async function getExecutionResults(supabaseAdmin: any, executionId: string): Promise<ExecutionResults> {
  const { data, error } = await supabaseAdmin
    .from("dataset_execution_results")
    .select("results")
    .eq("execution_id", executionId)
    .single();

  if (error || !data) {
    console.error("Results not found or error:", error);
    throw new Error(error?.message || "Results not found");
  }

  return data;
}

/**
 * Saves export record to the database
 * @param supabaseAdmin Supabase admin client
 * @param params Export record parameters
 */
export async function saveExportRecord(supabaseAdmin: any, params: {
  executionId: string;
  datasetId: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}): Promise<void> {
  try {
    console.log("Saving export record to database:", {
      execution_id: params.executionId,
      file_path: params.filePath,
      user_id: params.userId,
      format: params.fileType,
      file_size: params.fileSize
    });
    
    // Insert record based on actual table structure
    const { error } = await supabaseAdmin
      .from("user_storage_exports")
      .insert({
        execution_id: params.executionId,
        file_path: params.filePath,
        user_id: params.userId,
        format: params.fileType,
        file_size: params.fileSize
      });
      
    if (error) {
      console.error("Error inserting export record:", error);
      throw error;
    }
    
    console.log("Successfully saved export record");
  } catch (insertError) {
    console.error("Error in saveExportRecord:", insertError);
    throw insertError;
  }
}
