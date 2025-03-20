// supabase/functions/Dataset_Preview/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication required" 
        }),
        { headers: corsHeaders, status: 401 }
      );
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Execution error: ${executionError.message}` 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Return appropriate data based on execution status
    if (execution.status === "running" || execution.status === "pending") {
      return new Response(
        JSON.stringify({
          success: true,
          status: execution.status,
          message: "Dataset execution is still in progress"
        }),
        { headers: corsHeaders, status: 200 }
      );
    }

    if (execution.status === "failed") {
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          error: execution.error_message || "Dataset execution failed"
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Get preview data
    const data = execution.data || [];
    const preview = Array.isArray(data) ? data.slice(0, limit) : [data];
    
    // Get dataset columns (from first record)
    const columns = preview.length > 0
      ? Object.keys(preview[0]).map(key => ({ key, label: key }))
      : [];

    return new Response(
      JSON.stringify({
        success: true,
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
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (error) {
    console.error("Error in Dataset_Preview:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});