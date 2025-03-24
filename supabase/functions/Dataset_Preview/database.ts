
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

/**
 * Create a Supabase client from request
 */
export function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
                     Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  // Get the auth token from the request header
  const authHeader = req.headers.get("Authorization");
  
  // Create client options with auth if available
  const options: any = {};
  if (authHeader) {
    options.global = {
      headers: {
        Authorization: authHeader
      }
    };
  }
  
  return createClient(supabaseUrl, supabaseKey, options);
}

/**
 * Fetches execution record from database
 */
export async function fetchExecutionRecord(supabaseClient: any, executionId: string) {
  console.log(`Querying database for execution ID: ${executionId}`);
  
  // Start performance timer
  const startTime = performance.now();
  
  const { data: execution, error: executionError } = await supabaseClient
    .from("dataset_executions")
    .select(`
      id,
      status,
      data,
      error_message,
      dataset_id,
      start_time,
      end_time,
      row_count,
      execution_time_ms,
      metadata,
      dataset:dataset_id(
        id,
        name,
        dataset_type,
        template_id
      )
    `)
    .eq("id", executionId)
    .single();
  
  const queryTime = performance.now() - startTime;
  console.log(`Database query completed in ${queryTime.toFixed(2)}ms`);
  
  if (executionError) {
    console.error("Error fetching execution:", executionError);
    throw new Error(`Database error: ${executionError.message}`);
  }
  
  if (!execution) {
    console.error("Execution not found:", executionId);
    throw new Error("Execution not found");
  }
  
  console.log(`Found execution with status: ${execution.status}, row_count: ${execution.row_count || 0}`);
  
  return execution;
}
