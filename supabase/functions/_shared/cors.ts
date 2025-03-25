
/**
 * CORS handling for Edge Functions
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

/**
 * Handles CORS preflight requests
 * @param req Request object
 * @returns Response or null if not a preflight request
 */
export function handleCors(req: Request): Response | null {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Constructs an error response with CORS headers
 * @param message Error message
 * @param status HTTP status code
 * @returns Response object
 */
export function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message 
    }),
    { 
      headers: corsHeaders, 
      status 
    }
  );
}

/**
 * Constructs a success response with CORS headers
 * @param data Response data
 * @param status HTTP status code
 * @returns Response object
 */
export function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({ 
      success: true,
      ...data
    }),
    { 
      headers: corsHeaders, 
      status 
    }
  );
}
