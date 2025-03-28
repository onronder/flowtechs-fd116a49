
// Define CORS headers for Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Create a success response with CORS headers
 */
export function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      ...data
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(message: string, details?: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      details: details
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
}
