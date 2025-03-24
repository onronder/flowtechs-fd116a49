
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * Gets Supabase client from environment and request auth
 * @param req The request object
 * @returns Supabase client
 */
export async function getSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    throw new Error("Server configuration error");
  }

  // Get the auth token from request
  const authHeader = req.headers.get("Authorization");
  console.log("Auth header present:", !!authHeader);
  
  // Use service role directly to simplify auth process - we'll later check if the user has access to the execution
  const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);
  
  // If there's an auth header, get the user ID for ownership check
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      if (userData?.user) {
        console.log(`Authenticated user: ${userData.user.id}`);
      } else {
        console.log("Auth getUser error or no user:", userError);
      }
    } catch (authError) {
      console.error("Error processing authentication:", authError);
    }
  }

  return supabase;
}
