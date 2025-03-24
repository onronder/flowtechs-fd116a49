
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";
import { parseRequestBody, createSupabaseClient, validateEnvironment } from "./utils.ts";
import { fetchDataset, fetchTemplate, createExecutionRecord, determineExecutionFunction } from "./databaseService.ts";
import { invokeExecutionFunction, prepareExecutionPayload } from "./executionService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log("Dataset_Execute function called");
    
    // Parse the request body
    const parsedBody = await parseRequestBody(req);
    if (!parsedBody) {
      return errorResponse("Invalid or empty request body. The datasetId is required.", 400);
    }
    
    const { datasetId } = parsedBody;    
    console.log("Processing dataset execution for datasetId:", datasetId);
    
    // Validate environment
    const env = validateEnvironment();
    if (!env.valid) {
      return errorResponse("Server configuration error", 500);
    }
    
    // Create Supabase client
    const supabaseClient = createSupabaseClient(
      env.url!,
      env.key!,
      req.headers.get("Authorization") || ""
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

    try {
      // Get dataset details
      const dataset = await fetchDataset(supabaseClient, datasetId, user.id);
      if (!dataset) {
        return errorResponse("Dataset not found or access denied", 404);
      }
      
      // Get template if needed
      const template = await fetchTemplate(supabaseClient, dataset);
      
      // Create execution record
      const execution = await createExecutionRecord(supabaseClient, datasetId, user.id);
      
      // Determine which execution function to use
      const executionFunction = determineExecutionFunction(dataset);
      console.log("Using execution function:", executionFunction);
      
      // Prepare execution payload
      const payload = prepareExecutionPayload(execution, datasetId, user.id, template);
      
      // Invoke the execution function - don't wait for it to complete
      try {
        await invokeExecutionFunction(env.url!, executionFunction, payload, req.headers.get("Authorization") || "");
        console.log("Execution function invoked successfully");
      } catch (invocationError) {
        console.error("Error invoking execution function:", invocationError);
        // We'll continue and return the execution ID even if there's an invocation error
        // This allows the client to still poll for updates
      }
      
      // Return the execution ID immediately so the client can poll for updates
      console.log("Execution initiated, returning executionId:", execution.id);
      return successResponse({
        message: "Dataset execution initiated",
        executionId: execution.id
      }, 200);
    } catch (error) {
      console.error("Error during execution setup:", error);
      return errorResponse(error.message, 400);
    }
  } catch (error) {
    console.error("Error in Dataset_Execute:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
