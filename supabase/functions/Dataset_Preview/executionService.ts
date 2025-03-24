
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

/**
 * Fetches execution details from the database
 */
export async function fetchExecutionDetails(
  req: Request,
  executionId: string,
  limit: number = 100,
  checkStatus: boolean = false
): Promise<any> {
  console.log(`Fetching execution details for ID: ${executionId}, limit: ${limit}`);
  
  // Get Supabase client
  const supabaseClient = createSupabaseClient(req);
  
  // Get execution details
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
  
  if (executionError) {
    console.error("Error fetching execution:", executionError);
    throw new Error(`Database error: ${executionError.message}`);
  }
  
  if (!execution) {
    console.error("Execution not found:", executionId);
    throw new Error("Execution not found");
  }
  
  // Check for execution that may be stuck in pending/running state
  if (checkStatus && 
      (execution.status === 'pending' || execution.status === 'running') && 
      execution.start_time) {
    const startTime = new Date(execution.start_time).getTime();
    const currentTime = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    
    // If the execution has been running for more than 15 minutes, it might be stuck
    if (currentTime - startTime > fifteenMinutes) {
      return {
        status: 'stuck',
        execution: {
          id: execution.id,
          startTime: execution.start_time,
          status: execution.status
        },
        dataset: execution.dataset,
        preview: [],
        totalCount: 0,
        error: "Execution appears to be stuck"
      };
    }
  }
  
  // Process the result based on the execution status
  if (execution.status === "completed" && execution.data) {
    // Extract columns from the first row
    const columns = execution.data && execution.data.length > 0
      ? extractColumns(execution.data[0])
      : [];
      
    return {
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count,
        executionTimeMs: execution.execution_time_ms,
        apiCallCount: execution.metadata?.api_call_count
      },
      dataset: execution.dataset,
      columns: columns,
      preview: execution.data.slice(0, limit),
      totalCount: execution.row_count || execution.data.length,
    };
  } else {
    // Return basic info for incomplete or failed executions
    return {
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time
      },
      dataset: execution.dataset,
      columns: [],
      preview: [],
      totalCount: 0,
      error: execution.error_message
    };
  }
}

/**
 * Extract columns from a data row
 */
function extractColumns(row: any): Array<{ key: string; label: string }> {
  if (!row) return [];
  
  return Object.keys(row).map(key => ({
    key,
    label: formatColumnLabel(key)
  }));
}

/**
 * Format column labels for display
 */
function formatColumnLabel(key: string): string {
  // Convert camelCase or snake_case to Title Case
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Create a Supabase client from request
 */
function createSupabaseClient(req: Request) {
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
