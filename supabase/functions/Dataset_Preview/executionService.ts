
import { createSupabaseClient, fetchExecutionRecord } from "./database.ts";
import { buildExecutionResponse } from "./responseBuilder.ts";

/**
 * Fetches execution details from the database
 */
export async function fetchExecutionDetails(
  req: Request,
  executionId: string,
  limit: number = 5,
  checkStatus: boolean = false
): Promise<any> {
  console.log(`Fetching execution details for ID: ${executionId}, limit: ${limit}, checkStatus: ${checkStatus}`);
  
  // Get Supabase client
  const supabaseClient = createSupabaseClient(req);
  
  try {
    // Get execution details
    const execution = await fetchExecutionRecord(supabaseClient, executionId);
    
    // Build and return the response
    return buildExecutionResponse(execution, limit, checkStatus);
  } catch (error) {
    console.error(`Error in fetchExecutionDetails:`, error);
    throw error;
  }
}
