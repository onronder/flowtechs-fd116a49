
/**
 * Service for creating Supabase client
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Create a Supabase client
 */
export function createSupabaseClient(supabaseUrl: string, supabaseKey: string, authHeader: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
}
