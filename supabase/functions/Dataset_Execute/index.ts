
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { datasetId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseClient = createClient(
      supabaseUrl ?? "",
      supabaseAnonKey ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get the user ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return errorResponse("Authentication required", 401);
    }

    // Get dataset details
    const { data: dataset, error: datasetError } = await supabaseClient
      .from("user_datasets")
      .select(`
        *,
        source:source_id(*)
      `)
      .eq("id", datasetId)
      .eq("user_id", user.id)
      .single();

    if (datasetError) {
      return errorResponse(`Dataset error: ${datasetError.message}`, 400);
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabaseClient
      .from("dataset_executions")
      .insert({
        dataset_id: datasetId,
        user_id: user.id,
        status: "pending",
        metadata: {}
      })
      .select()
      .single();

    if (executionError) {
      return errorResponse(`Execution record error: ${executionError.message}`, 500);
    }

    // Execute the dataset based on its type
    let executionFunction: string;
    
    switch (dataset.dataset_type) {
      case "predefined":
        executionFunction = "Pre_ExecuteDataset";
        break;
      case "dependent":
        executionFunction = "Dep_ExecuteDataset";
        break;
      case "custom":
        executionFunction = "Cust_ExecuteDataset";
        break;
      default:
        return errorResponse(`Unknown dataset type: ${dataset.dataset_type}`, 400);
    }

    // Invoke the appropriate execution function
    fetch(`${supabaseUrl}/functions/v1/${executionFunction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization")!
      },
      body: JSON.stringify({
        executionId: execution.id,
        datasetId: datasetId,
        userId: user.id
      })
    }).catch(e => console.error(`Error invoking ${executionFunction}:`, e));

    // Return the execution ID immediately so the client can poll for updates
    return successResponse({
      message: "Dataset execution initiated",
      executionId: execution.id
    }, 200);
  } catch (error) {
    console.error("Error in Dataset_Execute:", error);
    return errorResponse(error.message, 500);
  }
});
