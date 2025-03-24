
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    console.log("Dataset_Preview function called");

    // Parse request
    let requestBody;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      requestBody = JSON.parse(text);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { executionId, limit = 100 } = requestBody;
    
    if (!executionId) {
      console.error("Missing required parameter: executionId");
      return errorResponse("Missing required parameter: executionId", 400);
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return errorResponse("Server configuration error", 500);
    }

    // Extract auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return errorResponse("Authentication required", 401);
    }

    // Create an auth client to validate user has permission
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get the user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return errorResponse("Authentication required", 401);
    }
    
    console.log(`Authenticated user: ${user.id}`);

    // Create a client with service role for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

    // First verify that the user owns this execution
    const { data: executionCheck, error: executionCheckError } = await supabase
      .from("dataset_executions")
      .select("id, user_id")
      .eq("id", executionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (executionCheckError) {
      console.error("Error checking execution ownership:", executionCheckError);
      return errorResponse(`Database error: ${executionCheckError.message}`, 500);
    }

    if (!executionCheck) {
      console.error("Execution not found or not owned by user");
      return errorResponse("Execution not found or not authorized", 404);
    }

    // Now get the execution data
    const { data: execution, error: executionError } = await supabase
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
        dataset:dataset_id (id, name, dataset_type, template:template_id(name))
      `)
      .eq("id", executionId)
      .single();

    if (executionError) {
      console.error("Error fetching execution:", executionError);
      return errorResponse(`Database error: ${executionError.message}`, 500);
    }

    // Format response based on execution status
    const response: Record<string, any> = {
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count,
        executionTimeMs: execution.execution_time_ms,
        apiCallCount: execution.metadata?.api_call_count
      },
      dataset: {
        id: execution.dataset?.id,
        name: execution.dataset?.name,
        type: execution.dataset?.dataset_type,
        template: execution.dataset?.template
      },
      columns: [],
      error: execution.error_message
    };

    // Handle different execution states
    if (execution.status === "completed") {
      // Extract columns from data if available
      if (execution.data && Array.isArray(execution.data) && execution.data.length > 0) {
        const firstRow = execution.data[0];
        if (typeof firstRow === 'object' && firstRow !== null) {
          response.columns = Object.keys(firstRow).map(key => ({
            key,
            label: key
          }));
        }
      }

      // Set preview data
      response.preview = Array.isArray(execution.data) 
        ? execution.data.slice(0, limit) 
        : [];
      
      response.totalCount = execution.row_count || 0;
    } else {
      // Pending or running
      response.preview = [];
      response.totalCount = 0;
    }

    console.log(`Response for execution ${executionId}:`, response);
    return successResponse(response);
  } catch (error) {
    console.error("Error in Dataset_Preview:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
