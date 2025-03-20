
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
    console.log("Dataset_Preview request received");
    
    // Parse the request body
    let body;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      
      if (!text || text.trim() === '') {
        return errorResponse("Empty request body", 400);
      }
      
      body = JSON.parse(text);
      console.log("Parsed request body:", JSON.stringify(body));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return errorResponse("Invalid JSON in request body", 400);
    }
    
    // Validate required parameters
    const { executionId, limit = 10 } = body;

    if (!executionId) {
      console.error("Missing executionId parameter");
      return errorResponse("Missing required parameter: executionId", 400);
    }

    // Initialize Supabase client with authorization from the request
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get the user ID for security checks
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return errorResponse("Authentication required", 401);
    }

    console.log(`Fetching execution ID: ${executionId} for user: ${user.id}`);
    
    // Get execution data
    const { data: execution, error: executionError } = await supabaseClient
      .from("dataset_executions")
      .select(`
        *,
        dataset:dataset_id(*)
      `)
      .eq("id", executionId)
      .single();

    if (executionError) {
      console.error("Error fetching execution:", executionError);
      return errorResponse(`Execution not found: ${executionError.message}`, 404);
    }
    
    console.log(`Found execution with status: ${execution.status}`);

    // Return appropriate data based on execution status
    if (execution.status === "running" || execution.status === "pending") {
      return successResponse({
        status: execution.status,
        message: "Dataset execution is still in progress"
      });
    }

    if (execution.status === "failed") {
      return errorResponse(execution.error_message || "Dataset execution failed", 400);
    }

    // Get preview data
    const data = execution.data || [];
    const preview = Array.isArray(data) ? data.slice(0, limit) : [data];
    
    // Get dataset columns (from first record)
    const columns = preview.length > 0
      ? Object.keys(preview[0]).map(key => ({ key, label: key }))
      : [];

    return successResponse({
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count,
        executionTimeMs: execution.execution_time_ms,
        apiCallCount: execution.api_call_count
      },
      dataset: {
        id: execution.dataset.id,
        name: execution.dataset.name,
        type: execution.dataset.dataset_type
      },
      columns,
      preview,
      totalCount: execution.row_count
    });
  } catch (error) {
    console.error("Error in Dataset_Preview:", error);
    return errorResponse(error.message, 500);
  }
});
