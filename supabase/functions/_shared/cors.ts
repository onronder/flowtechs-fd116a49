
// Shared CORS headers for all Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Handles CORS preflight requests
 * @param req The request object
 * @returns Response for OPTIONS requests or null for other methods
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

/**
 * Creates an error response with proper CORS headers
 * @param message Error message
 * @param status HTTP status code
 * @returns Response object
 */
export function errorResponse(message: string, status = 400): Response {
  console.error(`Error response: ${message}`);
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
  );
}

/**
 * Creates a success response with proper CORS headers
 * @param data Response data
 * @returns Response object
 */
export function successResponse(data: any): Response {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
