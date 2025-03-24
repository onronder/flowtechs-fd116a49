
/**
 * Service for fetching dataset and template details
 */

/**
 * Fetch dataset and template details
 */
export async function fetchDatasetDetails(supabaseClient: any, datasetId: string, userId: string) {
  console.log(`Fetching dataset details for datasetId: ${datasetId}, userId: ${userId}`);
  
  // First, get the dataset with its source
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
    console.error("Dataset not found");
    throw new Error("Dataset not found");
  }
  
  if (!dataset.source || !dataset.source.config) {
    console.error("Source or source config not found");
    throw new Error("Missing or invalid source configuration");
  }
  
  // Try to get the template using the appropriate method
  const template = await fetchTemplateById(supabaseClient, dataset.template_id);
  
  return { dataset, template };
}

/**
 * Fetch template by ID using various fallback methods
 */
async function fetchTemplateById(supabaseClient: any, templateId: string) {
  if (!templateId) {
    console.log("No template ID provided");
    return null;
  }

  console.log("Fetching template with ID:", templateId);
  
  // Try with direct query to query_templates first
  let template = null;
  let templateError = null;
  
  try {
    const { data: queryTemplate, error: queryError } = await supabaseClient
      .from("query_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();
    
    if (queryTemplate) {
      console.log("Found template in query_templates:", queryTemplate.id);
      return queryTemplate;
    } else if (queryError) {
      console.warn("Error fetching from query_templates:", queryError);
      templateError = queryError;
    }
  } catch (error) {
    console.warn("Exception querying query_templates:", error);
  }
  
  // If not found, try dependent_query_templates
  try {
    const { data: depTemplate, error: depError } = await supabaseClient
      .from("dependent_query_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();
    
    if (depTemplate) {
      console.log("Found template in dependent_query_templates:", depTemplate.id);
      return depTemplate;
    } else if (depError) {
      console.warn("Error fetching from dependent_query_templates:", depError);
      templateError = templateError || depError;
    }
  } catch (error) {
    console.warn("Exception querying dependent_query_templates:", error);
  }
  
  // If template still not found, try with RPC
  try {
    const { data, error } = await supabaseClient.rpc('get_template_by_id', { 
      template_id: templateId
    });
    
    if (data && !error) {
      console.log("Found template using RPC:", data.id);
      return data;
    }
  } catch (error) {
    console.warn("Exception with RPC template fetch:", error);
  }
  
  // If we couldn't find the template, throw an error
  console.error("Template not found for ID:", templateId);
  const errorMsg = templateError 
    ? `Template error: ${templateError.message}` 
    : "Template not found";
  throw new Error(errorMsg);
}
