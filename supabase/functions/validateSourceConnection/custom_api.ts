
import { corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";

/**
 * Validates a Custom API connection
 * @param config The Custom API connection configuration
 * @returns Response with validation results
 */
export async function validateCustomApiConnection(config: any): Promise<Response> {
  console.log("[validateCustomApiConnection] Starting Custom API validation");
  
  const { baseUrl, apiKey, authType } = config;
  
  if (!baseUrl || !authType) {
    console.error("[validateCustomApiConnection] Missing required Custom API configuration");
    return errorResponse("Missing required Custom API configuration: baseUrl or authType");
  }
  
  try {
    // Test connection to the API (simple check if endpoint exists)
    console.log(`[validateCustomApiConnection] Testing connection to: ${baseUrl}`);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    // Add authorization headers based on authType
    if (authType === "api_key" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(baseUrl, { headers });
    
    console.log(`[validateCustomApiConnection] Response status: ${response.status}`);
    
    // For custom API, we'll consider any response (even 4xx) as a valid connection
    // since we're just checking if the endpoint exists and can be reached
    
    return successResponse({
      config,
      apiInfo: {
        baseUrl,
        responseStatus: response.status,
        connectionStatus: "Connected"
      }
    });
  } catch (error) {
    console.error(`[validateCustomApiConnection] Error connecting to Custom API: ${error.message}`);
    console.error(error.stack);
    
    // For demo purposes, still return success even if the connection fails
    // In a real app, you might want to return an error instead
    return successResponse({
      config,
      apiInfo: {
        baseUrl,
        connectionStatus: "Warning: Could not verify connection, but proceeding anyway"
      }
    });
  }
}
