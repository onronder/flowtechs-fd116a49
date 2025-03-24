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
  console.log(`Fetching execution details for ID: ${executionId}, limit: ${limit}, checkStatus: ${checkStatus}`);
  
  // Get Supabase client
  const supabaseClient = createSupabaseClient(req);
  
  // Start performance timer
  const startTime = performance.now();
  
  try {
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
    
    // Check for execution that may be stuck in pending/running state
    if (checkStatus && 
        (execution.status === 'pending' || execution.status === 'running') && 
        execution.start_time) {
      const startTime = new Date(execution.start_time).getTime();
      const currentTime = new Date().getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      
      // If the execution has been running for more than 15 minutes, it might be stuck
      if (currentTime - startTime > fifteenMinutes) {
        console.log(`Execution appears to be stuck (running for over 15 minutes)`);
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
      const dataLength = Array.isArray(execution.data) ? execution.data.length : 0;
      console.log(`Processing completed execution with ${dataLength} rows of data`);
      
      // Extract columns from the first row
      const columns = execution.data && execution.data.length > 0
        ? extractColumns(execution.data[0])
        : [];
      
      // Log sample data row for debugging (first row, safely limit object depth)
      if (dataLength > 0) {
        try {
          const sampleRow = execution.data[0];
          console.log(`Sample data row keys: ${Object.keys(sampleRow).join(', ')}`);
        } catch (err) {
          console.error("Error logging sample row:", err);
        }
      }
      
      // Limit the number of rows to the requested limit
      const preview = execution.data.slice(0, limit);
      console.log(`Returning preview with ${preview.length} rows and ${columns.length} columns`);
      
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
        preview: preview,
        totalCount: execution.row_count || execution.data.length,
      };
    } else {
      // Return basic info for incomplete or failed executions
      console.log(`Returning data for ${execution.status} execution`);
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
  } catch (error) {
    console.error(`Error in fetchExecutionDetails:`, error);
    throw error;
  }
}

/**
 * Extract columns from a data row
 */
function extractColumns(row: any): Array<{ key: string; label: string }> {
  if (!row) return [];
  
  try {
    const keys = Object.keys(row);
    console.log(`Extracted ${keys.length} columns from data row`);
    
    return keys.map(key => ({
      key,
      label: formatColumnLabel(key)
    }));
  } catch (err) {
    console.error("Error extracting columns:", err);
    return [];
  }
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
