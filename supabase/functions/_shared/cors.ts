
// CORS headers for Supabase Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

// Helper function to handle CORS preflight requests
export function handleCors(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

// Helper function for error responses
export function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message 
    }),
    { headers: corsHeaders, status }
  );
}

// Helper function for success responses
export function successResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { headers: corsHeaders, status }
  );
}
