
/**
 * Functions to handle dataset execution
 */

/**
 * Invoke the appropriate dataset execution function
 */
export async function invokeExecutionFunction(
  supabaseUrl: string,
  executionFunction: string,
  payload: any,
  authHeader: string
): Promise<void> {
  console.log("Invoking function with payload:", JSON.stringify(payload));
  
  try {
    // Use edge function invoke to trigger the execution function
    const response = await fetch(`${supabaseUrl}/functions/v1/${executionFunction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader || ""
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from ${executionFunction}: ${response.status} ${errorText}`);
      throw new Error(`Failed to invoke ${executionFunction}: ${response.status} ${errorText}`);
    }
    
    console.log(`Successfully invoked ${executionFunction}`);
  } catch (e) {
    console.error(`Error invoking ${executionFunction}:`, e);
    throw e;
  }
}

/**
 * Prepare the payload for the execution function
 */
export function prepareExecutionPayload(execution: any, datasetId: string, userId: string, template: any): any {
  // Create a comprehensive payload with all needed information
  return {
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
}
