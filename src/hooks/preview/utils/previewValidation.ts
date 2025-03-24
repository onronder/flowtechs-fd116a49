
import { supabase } from "@/integrations/supabase/client";

/**
 * Validates that the user is authenticated
 * @throws Error if user is not authenticated
 */
export async function validateAuthentication(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error("[Preview] No active session found");
    throw new Error("Authentication required to view preview data");
  }
}

/**
 * Validates execution ID is provided
 * @throws Error if execution ID is missing
 */
export function validateExecutionId(executionId: string): void {
  if (!executionId) {
    throw new Error("Execution ID is required");
  }
}
