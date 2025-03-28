import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches execution data directly from the database using RPC
 * @param executionId The execution ID
 * @returns The execution data
 */
export async function fetchDirectExecutionData(executionId: string) {
  try {
    console.log(`[fetchDirectExecutionData] Fetching raw data for execution ${executionId}`);
    
    // Get the current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      throw new Error("Authentication required");
    }
    
    if (!user) {
      console.error("No user found");
      throw new Error("Authentication required");
    }
    
    console.log(`[fetchDirectExecutionData] User ID: ${user.id}`);
    
    // Call the RPC function with user ID for security
    const { data, error } = await supabase.rpc(
      'get_execution_raw_data', 
      { 
        p_execution_id: executionId,
        p_user_id: user.id
      }
    );
    
    if (error) {
      console.error("RPC error:", error);
      throw new Error(`Failed to fetch execution data: ${error.message}`);
    }
    
    if (!data) {
      console.warn(`[fetchDirectExecutionData] No data found for execution ${executionId}`);
      return null;
    }
    
    console.log(`[fetchDirectExecutionData] Successfully fetched data for execution ${executionId}`);
    return data;
  } catch (error) {
    console.error("Error in fetchDirectExecutionData:", error);
    throw error;
  }
}
