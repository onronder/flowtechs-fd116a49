
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log("Dataset_Execute function called");
    
    // Parse the request body with proper error handling
    let body;
    let datasetId;
    
    try {
      const contentType = req.headers.get("Content-Type") || "";
      console.log("Content-Type header:", contentType);
      
      if (contentType.includes("application/json")) {
        const text = await req.text();
        console.log("Raw request body:", text);
        
        if (!text || text.trim() === '') {
          console.error("Empty request body");
          return errorResponse("Empty request body", 400);
        }
        
        try {
          body = JSON.parse(text);
          console.log("Parsed request body:", JSON.stringify(body));
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          return errorResponse("Invalid JSON in request body: " + parseError.message, 400);
        }
        
        // Extract datasetId from the parsed body
        datasetId = body.datasetId;
        
        if (!datasetId) {
          console.error("Missing required parameter: datasetId");
          return errorResponse("Missing required parameter: datasetId", 400);
        }
      } else {
        console.error("Unsupported content type:", contentType);
        return errorResponse(`Unsupported content type: ${contentType}. Expected application/json`, 400);
      }
    } catch (error) {
      console.error("Error parsing request body:", error);
      return errorResponse("Error parsing request body: " + error.message, 400);
    }
    
    console.log("Processing dataset execution for datasetId:", datasetId);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return errorResponse("Server configuration error", 500);
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { 
        global: { 
          headers: { 
            Authorization: req.headers.get("Authorization") || "" 
          } 
        } 
      }
    );

    // Get the user ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      console.error("Authentication error:", userError);
      return errorResponse("Authentication required: " + userError.message, 401);
    }
    
    if (!user) {
      console.error("No authenticated user found");
      return errorResponse("Authentication required", 401);
    }

    console.log("Authenticated user:", user.id);

    // Get dataset details in a single query
    const { data: dataset, error: datasetError } = await supabaseClient
      .from("user_datasets")
      .select(`
        *,
        source:source_id(*),
        template:template_id(*)
      `)
      .eq("id", datasetId)
      .eq("user_id", user.id)
      .single();

    if (datasetError) {
      console.error("Dataset fetch error:", datasetError);
      return errorResponse(`Dataset error: ${datasetError.message}`, 400);
    }

    if (!dataset) {
      console.error("Dataset not found for ID:", datasetId);
      return errorResponse("Dataset not found", 404);
    }

    console.log("Found dataset:", dataset.id, "Type:", dataset.dataset_type);
    
    if (!dataset.source) {
      console.error("Source not found for dataset:", datasetId);
      return errorResponse("Source not found for this dataset", 400);
    }
    
    console.log("Found source:", dataset.source.id, "Type:", dataset.source.source_type);

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
      console.error("Execution record error:", executionError);
      return errorResponse(`Execution record error: ${executionError.message}`, 500);
    }

    console.log("Created execution record:", execution.id);

    // Execute the dataset based on its type
    let executionFunction: string;
    
    switch (dataset.dataset_type) {
      case "predefined":
        if (!dataset.template) {
          console.error("Template not found for predefined dataset:", datasetId);
          return errorResponse("Template not found for this predefined dataset", 400);
        }
        executionFunction = "Pre_ExecuteDataset";
        break;
      case "dependent":
        executionFunction = "Dep_ExecuteDataset";
        break;
      case "custom":
        executionFunction = "Cust_ExecuteDataset";
        break;
      default:
        console.error("Unknown dataset type:", dataset.dataset_type);
        return errorResponse(`Unknown dataset type: ${dataset.dataset_type}`, 400);
    }

    console.log("Using execution function:", executionFunction);

    // Invoke the appropriate execution function with properly formatted JSON
    const invokePayload = {
      executionId: execution.id,
      datasetId: datasetId,
      userId: user.id
    };
    
    console.log("Invoking function with payload:", JSON.stringify(invokePayload));
    
    // Use edge function invoke to trigger the execution function
    await fetch(`${supabaseUrl}/functions/v1/${executionFunction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || ""
      },
      body: JSON.stringify(invokePayload)
    }).catch(e => {
      console.error(`Error invoking ${executionFunction}:`, e);
      // Continue execution - we want to return the execution ID even if the function invocation fails
      // The error will be logged and the execution status will be updated later
    });

    // Return the execution ID immediately so the client can poll for updates
    console.log("Execution initiated, returning executionId:", execution.id);
    return successResponse({
      message: "Dataset execution initiated",
      executionId: execution.id
    }, 200);
  } catch (error) {
    console.error("Error in Dataset_Execute:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
