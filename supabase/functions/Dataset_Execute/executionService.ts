
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
  console.log(`Invoking ${executionFunction} with payload:`, JSON.stringify(payload));
  
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
    
    // Check for successful response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${response.status} from ${executionFunction}:`, errorText);
      throw new Error(`Error ${response.status} invoking function: ${errorText}`);
    }
    
    console.log(`Successfully invoked ${executionFunction}`);
  } catch (e) {
    console.error(`Error invoking ${executionFunction}:`, e);
    // We'll continue execution but log the error - this will help with debugging
    // while still allowing the UI to show the execution status
  }
}

/**
 * Prepare the payload for the execution function
 */
export function prepareExecutionPayload(execution: any, datasetId: string, userId: string, template: any): any {
  // Create a more robust payload with just the necessary data
  const payload = {
    executionId: execution.id,
    datasetId: datasetId,
    userId: userId
  };
  
  // Only include template data if it exists and has the required fields
  if (template && Object.keys(template).length > 0) {
    // Make sure we only include serializable template data
    payload.template = {
      id: template.id,
      name: template.name,
      display_name: template.display_name || template.name,
      query_template: template.query_template,
      resource_type: template.resource_type,
      field_list: template.field_list || []
    };
  }
  
  return payload;
}
