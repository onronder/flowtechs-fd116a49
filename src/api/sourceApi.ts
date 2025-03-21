
import { supabase } from "@/integrations/supabase/client";

export async function fetchUserSources() {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function fetchSourceById(id: string) {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function validateSourceConnection(connectionData: any) {
  // We are calling the Supabase Edge function to validate the connection
  const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
    body: connectionData,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
