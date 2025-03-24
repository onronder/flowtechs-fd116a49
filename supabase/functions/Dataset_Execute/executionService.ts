
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
    await fetch(`${supabaseUrl}/functions/v1/${executionFunction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader || ""
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Successfully invoked ${executionFunction}`);
  } catch (e) {
    console.error(`Error invoking ${executionFunction}:`, e);
    // Continue execution - we want to return the execution ID even if the function invocation fails
    // The error will be logged and the execution status will be updated later
  }
}

/**
 * Prepare the payload for the execution function
 */
export function prepareExecutionPayload(execution: any, datasetId: string, userId: string, template: any): any {
  return {
    executionId: execution.id,
    datasetId: datasetId,
    userId: userId,
    // Include the template if we fetched it separately
    template: template
  };
}
