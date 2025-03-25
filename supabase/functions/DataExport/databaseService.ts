
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
  console.log(`Fetching execution data for ID: ${executionId}`);
  
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

  console.log(`Successfully fetched execution data: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Fetches execution results from the database
 * @param supabaseAdmin Supabase admin client
 * @param executionId Execution ID
 * @returns Execution results or throws error
 */
export async function getExecutionResults(supabaseAdmin: any, executionId: string): Promise<ExecutionResults> {
  console.log(`Fetching execution results for ID: ${executionId}`);
  
  try {
    // Try to fetch from dataset_execution_results table
    const { data, error } = await supabaseAdmin
      .from("dataset_execution_results")
      .select("results")
      .eq("execution_id", executionId)
      .single();

    if (error) {
      console.warn(`Error fetching from dataset_execution_results: ${error.message}`);
      throw error;
    }

    if (!data) {
      console.warn("No results found in dataset_execution_results");
      throw new Error("Results not found");
    }

    console.log(`Successfully fetched execution results from dataset_execution_results`);
    return data;
  } catch (primaryError) {
    console.log(`Falling back to dataset_executions.data for results...`);
    
    // Fallback to direct data in the execution record
    try {
      const { data: executionData, error: execError } = await supabaseAdmin
        .from("dataset_executions")
        .select("data")
        .eq("id", executionId)
        .single();

      if (execError || !executionData || !executionData.data) {
        console.error("Fallback also failed:", execError);
        throw new Error(execError?.message || "Results not available in both tables");
      }

      console.log(`Successfully fetched results from execution data field`);
      
      // Return the data field in the expected format
      return { results: executionData.data };
    } catch (fallbackError) {
      console.error("Both primary and fallback fetches failed:", fallbackError);
      throw fallbackError;
    }
  }
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
      dataset_id: params.datasetId,
      file_path: params.filePath,
      user_id: params.userId,
      format: params.fileType,
      file_size: params.fileSize,
      file_url: params.fileUrl,
      file_name: params.fileName,
      file_type: params.fileType
    });
    
    // Insert record with all necessary fields
    const { error } = await supabaseAdmin
      .from("user_storage_exports")
      .insert({
        execution_id: params.executionId,
        dataset_id: params.datasetId,
        file_path: params.filePath,
        user_id: params.userId,
        format: params.fileType,
        file_size: params.fileSize,
        file_url: params.fileUrl,
        file_name: params.fileName,
        file_type: params.fileType
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
