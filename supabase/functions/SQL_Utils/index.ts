
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    console.log("SQL_Utils function called");
    
    // Parse request body
    const requestBody = await req.json();
    const { operation, parameters } = requestBody;
    
    console.log(`Requested operation: ${operation}`);
    console.log(`Parameters: ${JSON.stringify(parameters)}`);
    
    // Initialize Supabase client with authorization from the request
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",  // Use service role for database operations
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    // Authentication check
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return errorResponse("Authentication required", 401);
    }
    
    // Handle different operations
    switch (operation) {
      case "get_execution_data":
        return await getExecutionData(supabaseClient, parameters.executionId, user.id);
      
      default:
        return errorResponse(`Unsupported operation: ${operation}`, 400);
    }
  } catch (error) {
    console.error("Error in SQL_Utils:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});

/**
 * Get raw execution data using direct database access
 */
async function getExecutionData(supabaseClient: any, executionId: string, userId: string) {
  // Validate params
  if (!executionId) {
    return errorResponse("Missing execution ID", 400);
  }
  
  try {
    // First check if the execution exists and belongs to the user
    const { data: execution, error: execError } = await supabaseClient
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
      .eq("user_id", userId)
      .single();
    
    if (execError) {
      console.error("Error retrieving execution data:", execError);
      return errorResponse(`Failed to retrieve execution data: ${execError.message}`, 500);
    }
    
    if (!execution) {
      return errorResponse("Execution not found or not authorized", 404);
    }
    
    // Get the dataset info
    const { data: dataset, error: datasetError } = await supabaseClient
      .from("user_datasets")
      .select("id, name, dataset_type, template_id")
      .eq("id", execution.dataset_id)
      .single();
    
    if (datasetError) {
      console.error("Error retrieving dataset info:", datasetError);
    }
    
    // Try to extract columns from data if available
    let columns = [];
    if (execution.data && Array.isArray(execution.data) && execution.data.length > 0) {
      if (typeof execution.data[0] === 'object' && execution.data[0] !== null) {
        columns = Object.keys(execution.data[0]).map(key => ({
          key,
          label: key
        }));
      }
    }
    
    // Format response
    const response = {
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count,
        executionTimeMs: execution.execution_time_ms,
        apiCallCount: execution.metadata?.api_call_count
      },
      dataset: dataset ? {
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type,
        template_id: dataset.template_id
      } : {
        id: execution.dataset_id
      },
      columns: columns,
      preview: Array.isArray(execution.data) ? execution.data.slice(0, 100) : [],
      totalCount: execution.row_count || 0,
      error: execution.error_message
    };
    
    return successResponse(response);
  } catch (error) {
    console.error("Error in getExecutionData:", error);
    return errorResponse(`Error retrieving execution data: ${error.message}`, 500);
  }
}
