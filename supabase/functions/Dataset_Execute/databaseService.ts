
/**
 * Functions to handle database interactions for Dataset_Execute
 */

/**
 * Fetch dataset details with source
 */
export async function fetchDataset(supabaseClient: any, datasetId: string, userId: string) {
  console.log("Fetching dataset:", datasetId, "for user:", userId);
  
  const { data: dataset, error: datasetError } = await supabaseClient
    .from("user_datasets")
    .select("*, source:source_id(*)")
    .eq("id", datasetId)
    .eq("user_id", userId)
    .single();

  if (datasetError) {
    console.error("Dataset fetch error:", datasetError);
    throw new Error(`Dataset error: ${datasetError.message}`);
  }

  if (!dataset) {
    console.error("Dataset not found for ID:", datasetId);
    throw new Error("Dataset not found");
  }

  if (!dataset.source) {
    console.error("Source not found for dataset:", datasetId);
    throw new Error("Source not found for this dataset");
  }
  
  console.log("Found dataset:", dataset.id, "Type:", dataset.dataset_type);
  console.log("Found source:", dataset.source.id, "Type:", dataset.source.source_type);
  
  return dataset;
}

/**
 * Fetch template based on dataset type and template ID
 */
export async function fetchTemplate(supabaseClient: any, dataset: any) {
  if (!dataset.template_id) {
    console.log("No template ID for dataset:", dataset.id);
    return null;
  }
  
  console.log("Fetching template with ID:", dataset.template_id);
  
  // Determine which template table to query based on dataset type
  let templateTable = "query_templates";
  if (dataset.dataset_type === "dependent") {
    templateTable = "dependent_query_templates";
  }
  
  const { data: template, error: templateError } = await supabaseClient
    .from(templateTable)
    .select("*")
    .eq("id", dataset.template_id)
    .single();
    
  if (templateError) {
    console.error("Template fetch error:", templateError);
    console.log("Continuing execution without template");
    return null;
  }
  
  console.log("Found template:", template.id, template.name);
  return template;
}

/**
 * Create an execution record
 */
export async function createExecutionRecord(supabaseClient: any, datasetId: string, userId: string) {
  const { data: execution, error: executionError } = await supabaseClient
    .from("dataset_executions")
    .insert({
      dataset_id: datasetId,
      user_id: userId,
      status: "pending",
      metadata: {}
    })
    .select()
    .single();

  if (executionError) {
    console.error("Execution record error:", executionError);
    throw new Error(`Execution record error: ${executionError.message}`);
  }

  console.log("Created execution record:", execution.id);
  return execution;
}

/**
 * Determine which execution function to use based on dataset type
 */
export function determineExecutionFunction(dataset: any): string {
  switch (dataset.dataset_type) {
    case "predefined":
      return "Pre_ExecuteDataset";
    case "dependent":
      return "Dep_ExecuteDataset";
    case "custom":
      return "Cust_ExecuteDataset";
    case "direct_api":
      // Handle the pre_recent_orders_dashboard special case
      if (dataset.parameters && 
          typeof dataset.parameters === 'object' && 
          dataset.parameters.edge_function === 'pre_recent_orders_dashboard') {
        return "pre_recent_orders_dashboard";
      } else {
        throw new Error("Unknown direct_api edge function specified");
      }
    default:
      throw new Error(`Unknown dataset type: ${dataset.dataset_type}`);
  }
}
