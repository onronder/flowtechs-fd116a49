// CORS headers for cross-origin requests
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

/**
 * Handles CORS preflight requests
 * @param req The request object
 * @returns Response for preflight requests, null otherwise
 */
export function handleCors(req: Request): Response | null {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  // Otherwise, return null to continue with normal request handling
  return null;
}

/**
 * Returns a standardized error response
 * @param message Error message
 * @param status HTTP status code (default: 400)
 * @returns Response object
 */
export function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    { headers: corsHeaders, status }
  );
}

/**
 * Returns a standardized success response
 * @param data Response data
 * @param status HTTP status code (default: 200)
 * @returns Response object
 */
export function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { headers: corsHeaders, status }
  );
}
