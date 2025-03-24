
import { errorResponse, successResponse } from "./responseUtils.ts";
import { fetchExecutionDetails } from "./executionService.ts";
import { parseRequestBody } from "./utils.ts";

/**
 * Handles API requests to the Dataset_Preview function
 */
export async function handleRequest(req: Request): Promise<Response> {
  console.log("Dataset_Preview: Processing new request");
  
  // Parse request body
  const requestBody = await parseRequestBody(req);
  if (!requestBody) {
    console.error("Dataset_Preview: Invalid JSON in request body");
    return errorResponse("Invalid JSON in request body", 400);
  }

  const { executionId, limit = 5, secureMode = true, requestId } = requestBody;
  
  if (!executionId) {
    console.error("Dataset_Preview: Missing required parameter: executionId");
    return errorResponse("Missing required parameter: executionId", 400);
  }

  // Log request ID if present
  if (requestId) {
    console.log(`Dataset_Preview: Processing request ID ${requestId} for executionId=${executionId}`);
  }

  // Check for execution status manually if needed
  const checkStatus = requestBody.checkStatus === true;
  console.log(`Dataset_Preview: Processing request for executionId=${executionId}, limit=${limit}, checkStatus=${checkStatus}, secureMode=${secureMode}`);

  // Get execution details and format response
  try {
    console.log(`Dataset_Preview: Fetching execution details for ${executionId}`);
    const response = await fetchExecutionDetails(req, executionId, limit, checkStatus, secureMode);
    
    console.log(`Dataset_Preview: Successful response for execution ${executionId}:`, {
      status: response.status,
      previewRows: response.preview?.length || 0,
      totalCount: response.totalCount
    });
    
    return successResponse(response);
  } catch (error: any) {
    console.error(`Dataset_Preview: Error fetching execution details for ${executionId}:`, error);
    
    // Ensure we have a message property
    const errorMessage = error.message || "Unknown error";
    
    return errorResponse(
      `Failed to fetch execution details: ${errorMessage}`, 
      500
    );
  }
}
