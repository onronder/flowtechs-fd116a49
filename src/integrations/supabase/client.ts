
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://sxzgeevxciuxjyxfartx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4emdlZXZ4Y2l1eGp5eGZhcnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjE5OTEsImV4cCI6MjA1Nzk5Nzk5MX0.5imuQ_WsKVil6SJdpFXkfqE1btEpU3MiYPj74FlUQVk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  }
);
