
/**
 * Database operations for Pre_ExecuteDataset
 */

/**
 * Mark an execution as running
 */
export async function markExecutionAsRunning(supabaseClient: any, executionId: string) {
  await supabaseClient
    .from('dataset_executions')
    .update({
      status: 'running',
      start_time: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', executionId);
}

/**
 * Mark an execution as completed, storing the results
 */
export async function markExecutionAsCompleted(
  supabaseClient: any, 
  executionId: string, 
  results: any[], 
  executionTime: number,
  apiCallCount: number
) {
  // Store only the first 1000 rows in the data field to avoid huge payloads
  const previewData = results.slice(0, 1000);
  
  await supabaseClient
    .from('dataset_executions')
    .update({
      status: 'completed',
      end_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      row_count: results.length,
      execution_time_ms: executionTime,
      data: previewData,
      metadata: {
        api_call_count: apiCallCount
      }
    })
    .eq('id', executionId);
}

/**
 * Mark an execution as failed
 */
export async function markExecutionAsFailed(
  supabaseClient: any, 
  executionId: string, 
  errorMessage: string
) {
  await supabaseClient
    .from('dataset_executions')
    .update({
      status: 'failed',
      end_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: errorMessage
    })
    .eq('id', executionId);
}

/**
 * Create a Supabase client with auth
 */
export function createSupabaseClient(supabaseUrl: string, supabaseKey: string, authToken?: string) {
  const headers: Record<string, string> = {};
  
  if (authToken) {
    headers['Authorization'] = authToken;
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    global: { headers }
  });
}

/**
 * Fetch dataset details and template
 */
export async function fetchDatasetDetails(supabaseClient: any, datasetId: string, userId: string) {
  // Get dataset
  const { data: dataset, error: datasetError } = await supabaseClient
    .from('user_datasets')
    .select(`
      id,
      name,
      dataset_type,
      template_id,
      source:source_id (
        id,
        name,
        source_type,
        config
      )
    `)
    .eq('id', datasetId)
    .eq('user_id', userId)
    .single();
  
  if (datasetError) {
    throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
  }
  
  // Get template
  const { data: template, error: templateError } = await supabaseClient
    .from('query_templates')
    .select('*')
    .eq('id', dataset.template_id)
    .single();
  
  if (templateError) {
    throw new Error(`Failed to fetch template: ${templateError.message}`);
  }
  
  return { dataset, template };
}
