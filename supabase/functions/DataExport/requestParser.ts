
import { ExportOptions } from "./types.ts";
import { createErrorResponse } from "./corsHandler.ts";

/**
 * Parses and validates the request body
 * @param req Request object
 * @returns Parsed ExportOptions or throws error
 */
export async function parseRequest(req: Request): Promise<ExportOptions> {
  let requestText = '';
  
  try {
    requestText = await req.text();
    console.log("Request body length:", requestText.length);
    
    if (!requestText || requestText.trim() === '') {
      console.error("Empty request body received");
      throw new Error("Empty request body");
    }
    
    const requestData = JSON.parse(requestText);
    console.log("Parsed request data:", JSON.stringify(requestData));
    
    // Validate required fields
    if (!requestData.executionId) {
      throw new Error("Missing executionId parameter");
    }
    
    return {
      executionId: requestData.executionId,
      format: requestData.format || 'json',
      fileName: requestData.fileName || null,
      dataSource: requestData.dataSource || null
    };
  } catch (parseError) {
    console.error("Error parsing request JSON:", parseError, "Raw text:", requestText);
    throw parseError;
  }
}
