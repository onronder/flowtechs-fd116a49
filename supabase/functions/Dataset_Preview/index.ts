
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors } from "../_shared/cors.ts";
import { fetchExecutionDetails } from "./executionService.ts";
import { errorResponse, successResponse } from "./responseUtils.ts";

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

    // Get execution details and format response
    const response = await fetchExecutionDetails(req, executionId, limit);
    
    console.log(`Response for execution ${executionId}:`, {
      status: response.status,
      previewRows: response.preview?.length || 0,
      totalCount: response.totalCount
    });
    
    return successResponse(response);
  } catch (error) {
    console.error("Error in Dataset_Preview:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
