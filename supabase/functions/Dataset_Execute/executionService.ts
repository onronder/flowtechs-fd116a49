
/**
 * Functions to handle dataset execution
 */
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Invoke the appropriate dataset execution function
 */
export async function invokeExecutionFunction(
  supabaseUrl: string,
  executionFunction: string,
  payload: any,
  authHeader: string
): Promise<void> {
  console.log(`Invoking execution function: ${executionFunction}`);
  console.log("With payload:", JSON.stringify(payload));
  
  try {
    // Use edge function invoke to trigger the execution function
    const response = await fetch(`${supabaseUrl}/functions/v1/${executionFunction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader || "",
        ...corsHeaders
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from ${executionFunction}: ${response.status} ${errorText}`);
      throw new Error(`Failed to invoke ${executionFunction}: ${response.status} ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log(`Successfully invoked ${executionFunction}. Response:`, JSON.stringify(responseData));
  } catch (e) {
    console.error(`Error invoking ${executionFunction}:`, e);
    throw e;
  }
}

/**
 * Prepare the payload for the execution function
 */
export function prepareExecutionPayload(execution: any, datasetId: string, userId: string, template: any): any {
  console.log(`Preparing execution payload for dataset ${datasetId}`);
  
  // Create a comprehensive payload with all needed information
  const payload = {
    executionId: execution.id,
    datasetId: datasetId,
    userId: userId,
    // Include the template if we fetched it separately
    template: template ? {
      id: template.id,
      name: template.name,
      display_name: template.display_name,
      query_template: template.query_template,
      resource_type: template.resource_type,
      field_list: template.field_list
    } : null,
    // Add execution timestamp for diagnostics
    timestamp: new Date().toISOString()
  };
  
  console.log("Prepared payload:", JSON.stringify(payload));
  return payload;
}
