
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
);
