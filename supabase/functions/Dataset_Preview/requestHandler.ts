
import { errorResponse, successResponse } from "./responseUtils.ts";
import { fetchExecutionDetails } from "./executionService.ts";
import { parseRequestBody } from "./utils.ts";

/**
 * Handles API requests to the Dataset_Preview function
 */
export async function handleRequest(req: Request): Promise<Response> {
  // Parse request body
  const requestBody = await parseRequestBody(req);
  if (!requestBody) {
    return errorResponse("Invalid JSON in request body", 400);
  }

  const { executionId, limit = 100 } = requestBody;
  
  if (!executionId) {
    console.error("Missing required parameter: executionId");
    return errorResponse("Missing required parameter: executionId", 400);
  }

  // Check for execution status manually if needed
  const checkStatus = requestBody.checkStatus === true;

  // Get execution details and format response
  try {
    const response = await fetchExecutionDetails(req, executionId, limit, checkStatus);
    
    console.log(`Response for execution ${executionId}:`, {
      status: response.status,
      previewRows: response.preview?.length || 0,
      totalCount: response.totalCount
    });
    
    return successResponse(response);
  } catch (error) {
    console.error(`Error fetching execution details for ${executionId}:`, error);
    return errorResponse(
      `Failed to fetch execution details: ${error.message || "Unknown error"}`, 
      500
    );
  }
}
