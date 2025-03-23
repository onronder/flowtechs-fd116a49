
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
async function getExecutionData(supabaseClient, executionId, userId) {
  // Validate params
  if (!executionId) {
    return errorResponse("Missing execution ID", 400);
  }
  
  try {
    // Use RPC to call a database function for direct access
    const { data, error } = await supabaseClient.rpc(
      'get_execution_raw_data',
      { p_execution_id: executionId, p_user_id: userId }
    );
    
    if (error) {
      console.error("Error retrieving execution data:", error);
      return errorResponse(`Failed to retrieve execution data: ${error.message}`, 500);
    }
    
    return successResponse({
      success: true,
      data: data
    });
  } catch (error) {
    console.error("Error in getExecutionData:", error);
    return errorResponse(`Error retrieving execution data: ${error.message}`, 500);
  }
}
