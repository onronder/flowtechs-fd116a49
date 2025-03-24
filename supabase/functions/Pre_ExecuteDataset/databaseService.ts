
/**
 * Database operations for Pre_ExecuteDataset
 */

/**
 * Mark an execution as running
 */
export async function markExecutionAsRunning(supabaseClient: any, executionId: string) {
  try {
    console.log(`Marking execution ${executionId} as running`);
    
    await supabaseClient
      .from('dataset_executions')
      .update({
        status: 'running',
        start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId);
      
    console.log(`Successfully marked execution ${executionId} as running`);
  } catch (error) {
    console.error(`Error marking execution ${executionId} as running:`, error);
    throw error;
  }
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
  try {
    console.log(`Marking execution ${executionId} as completed with ${results.length} rows`);
    
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
      
    console.log(`Successfully marked execution ${executionId} as completed`);
  } catch (error) {
    console.error(`Error marking execution ${executionId} as completed:`, error);
    throw error;
  }
}

/**
 * Mark an execution as failed
 */
export async function markExecutionAsFailed(
  supabaseClient: any, 
  executionId: string, 
  errorMessage: string
) {
  try {
    console.log(`Marking execution ${executionId} as failed: ${errorMessage}`);
    
    await supabaseClient
      .from('dataset_executions')
      .update({
        status: 'failed',
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', executionId);
      
    console.log(`Successfully marked execution ${executionId} as failed`);
  } catch (error) {
    console.error(`Error marking execution ${executionId} as failed:`, error);
    throw error;
  }
}

/**
 * Create a Supabase client with auth
 */
export function createSupabaseClient(supabaseUrl: string, supabaseKey: string, authToken?: string) {
  // Avoid circular dependency - don't import the function from itself
  const { createClient } = require('@supabase/supabase-js');
  
  const headers: Record<string, string> = {};
  
  if (authToken) {
    // Check if the token starts with Bearer prefix
    if (authToken.startsWith('Bearer ')) {
      headers['Authorization'] = authToken;
    } else {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers }
  });
}

/**
 * Fetch dataset details and template
 */
export async function fetchDatasetDetails(supabaseClient: any, datasetId: string, userId: string) {
  try {
    console.log(`Fetching dataset details for dataset ${datasetId}, user ${userId}`);
    
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
      console.error(`Failed to fetch dataset: ${datasetError.message}`);
      throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
    }
    
    if (!dataset) {
      console.error('Dataset not found');
      throw new Error(`Dataset not found for ID: ${datasetId}`);
    }
    
    console.log(`Found dataset: ${dataset.id}, type: ${dataset.dataset_type}`);
    
    // Handle template fetch separately to avoid join issues
    let template = null;
    
    if (dataset.template_id) {
      // Try fetching from query_templates first
      const { data: queryTemplate, error: queryError } = await supabaseClient
        .from('query_templates')
        .select('*')
        .eq('id', dataset.template_id)
        .maybeSingle();
      
      if (queryTemplate) {
        console.log(`Found template in query_templates: ${queryTemplate.id}, name: ${queryTemplate.name}`);
        template = queryTemplate;
      } else {
        // If not found in query_templates, try dependent_query_templates
        const { data: dependentTemplate, error: dependentError } = await supabaseClient
          .from('dependent_query_templates')
          .select('*')
          .eq('id', dataset.template_id)
          .maybeSingle();
        
        if (dependentTemplate) {
          console.log(`Found template in dependent_query_templates: ${dependentTemplate.id}, name: ${dependentTemplate.name}`);
          template = dependentTemplate;
        } else {
          console.error(`Template not found with ID: ${dataset.template_id}`);
          if (queryError) console.error("Query templates error:", queryError.message);
          if (dependentError) console.error("Dependent templates error:", dependentError.message);
        }
      }
    }
    
    return { dataset, template };
  } catch (error) {
    console.error('Error in fetchDatasetDetails:', error);
    throw error;
  }
}
