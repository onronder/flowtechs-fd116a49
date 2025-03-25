
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json"
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

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
