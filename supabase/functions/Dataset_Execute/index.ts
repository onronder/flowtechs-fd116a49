
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse the request body with proper error handling
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
    
    const { datasetId } = body;
    
    if (!datasetId) {
      return errorResponse("Missing required parameter: datasetId", 400);
    }
    
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

    // Get dataset details - avoid using the join that causes the error
    const { data: dataset, error: datasetError } = await supabaseClient
      .from("user_datasets")
      .select("*")
      .eq("id", datasetId)
      .eq("user_id", user.id)
      .single();

    if (datasetError || !dataset) {
      return errorResponse(`Dataset error: ${datasetError?.message || "Dataset not found"}`, 400);
    }

    // If we need the source, fetch it separately
    const { data: source, error: sourceError } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("id", dataset.source_id)
      .single();

    if (sourceError) {
      return errorResponse(`Source error: ${sourceError.message}`, 400);
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

    // Invoke the appropriate execution function with properly formatted JSON
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
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
