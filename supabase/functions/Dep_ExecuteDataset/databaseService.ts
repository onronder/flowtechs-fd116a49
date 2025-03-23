
/**
 * Fetch dataset and source details
 */
export async function fetchDatasetAndSource(supabaseClient: any, datasetId: string, userId: string) {
  // Get dataset configuration
  const { data: dataset, error: datasetError } = await supabaseClient
    .from("user_datasets")
    .select(`
      *,
      source:source_id(*)
    `)
    .eq("id", datasetId)
    .eq("user_id", userId)
    .single();
  
  if (datasetError) {
    throw new Error(datasetError.message);
  }
  
  return dataset;
}

/**
 * Fetch dependent query template
 */
export async function fetchTemplate(supabaseClient: any, templateId: string) {
  // Get dependent query template
  const { data: template, error: templateError } = await supabaseClient
    .from("dependent_query_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  
  if (templateError) {
    throw new Error(templateError.message);
  }
  
  return template;
}

/**
 * Create execution record
 */
export async function createExecutionRecord(supabaseClient: any, datasetId: string, userId: string) {
  const { data: execution, error: executionError } = await supabaseClient
    .from("dataset_executions")
    .insert({
      dataset_id: datasetId,
      user_id: userId,
      status: "running"
    })
    .select()
    .single();
  
  if (executionError) {
    throw new Error(executionError.message);
  }
  
  return execution;
}

/**
 * Update execution record with results
 */
export async function updateExecutionRecord(
  supabaseClient: any, 
  executionId: string, 
  results: any[], 
  startTime: number, 
  endTime: number, 
  apiCallCount: number
) {
  const { error: updateError } = await supabaseClient
    .from("dataset_executions")
    .update({
      status: "completed",
      end_time: new Date().toISOString(),
      row_count: results.length,
      execution_time_ms: endTime - startTime,
      api_call_count: apiCallCount,
      data: results
    })
    .eq("id", executionId);
  
  if (updateError) {
    throw new Error(updateError.message);
  }
}
