
// supabase/functions/Dataset_Preview/index.ts
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
    const { executionId, limit = 10 } = await req.json();
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get the user ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse("Authentication required", 401);
    }

    // Get execution data
    const { data: execution, error: executionError } = await supabaseClient
      .from("dataset_executions")
      .select(`
        *,
        dataset:dataset_id(*)
      `)
      .eq("id", executionId)
      .eq("user_id", user.id)
      .single();

    if (executionError) {
      return errorResponse(`Execution error: ${executionError.message}`, 400);
    }

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
