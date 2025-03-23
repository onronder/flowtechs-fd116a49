
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse } from "../_shared/cors.ts";

/**
 * Parse and validate the request body
 */
export async function parseRequestBody(req: Request): Promise<{ datasetId: string } | null> {
  const contentType = req.headers.get("Content-Type") || "";
  console.log("Content-Type header:", contentType);
  
  if (!contentType.includes("application/json")) {
    console.error("Unsupported content type:", contentType);
    return null;
  }
  
  const text = await req.text();
  console.log("Raw request body text:", text);
  
  if (!text || text.trim() === '') {
    console.error("Empty request body");
    return null;
  }
  
  try {
    const body = JSON.parse(text);
    console.log("Parsed request body:", JSON.stringify(body));
    
    if (!body.datasetId) {
      console.error("Missing required parameter: datasetId");
      return null;
    }
    
    return { datasetId: body.datasetId };
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    return null;
  }
}

/**
 * Create and initialize Supabase client
 */
export function createSupabaseClient(supabaseUrl: string, supabaseAnonKey: string, authHeader: string) {
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

/**
 * Validate environment setup
 */
export function validateEnvironment(): { valid: boolean; url?: string; key?: string } {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    return { valid: false };
  }
  
  return { valid: true, url: supabaseUrl, key: supabaseAnonKey };
}
