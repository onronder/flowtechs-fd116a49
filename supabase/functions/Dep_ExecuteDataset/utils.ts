
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Parse and validate the request body
 */
export function validateAndParseRequest(req: Request): { datasetId: string; userId: string } | null {
  try {
    const contentType = req.headers.get("Content-Type") || "";
    
    if (!contentType.includes("application/json")) {
      console.error("Unsupported content type:", contentType);
      return null;
    }
    
    // Parse the JSON body
    const body = JSON.parse(req.text ? req.text() : "{}");
    
    if (!body.datasetId || !body.userId) {
      console.error("Missing required parameters: datasetId or userId");
      return null;
    }
    
    return { 
      datasetId: body.datasetId,
      userId: body.userId
    };
  } catch (e) {
    console.error("Error parsing request:", e);
    return null;
  }
}

/**
 * Create and initialize Supabase client
 */
export function createSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    { 
      global: { 
        headers: { 
          Authorization: authHeader || "" 
        } 
      } 
    }
  );
}
