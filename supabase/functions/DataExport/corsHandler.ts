
// CORS headers for cross-origin requests
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, save-to-storage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

/**
 * Handles CORS preflight requests
 * @param req Request object
 * @returns Response for CORS preflight or null
 */
export function handleCorsRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Creates an error response with CORS headers
 * @param message Error message
 * @param status HTTP status code
 * @returns Response object
 */
export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message 
    }),
    { headers: corsHeaders, status }
  );
}

/**
 * Creates a success response with CORS headers
 * @param data Response data
 * @returns Response object with CORS headers
 */
export function createSuccessResponse(data: any): Response {
  return new Response(
    JSON.stringify(data),
    { headers: corsHeaders }
  );
}
