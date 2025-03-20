
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all datasets for the current user
 */
export async function fetchUserDatasets() {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from("user_datasets")
    .select(`
      *,
      source:source_id(id, name, source_type),
      last_execution:dataset_executions(
        id,
        status,
        start_time,
        end_time,
        row_count,
        execution_time_ms
      )
    `)
    .eq("user_id", user.user.id)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  // Process the data to add some computed properties
  return data.map(dataset => ({
    ...dataset,
    last_execution_id: dataset.last_execution?.[0]?.id,
    last_execution_time: dataset.last_execution?.[0]?.end_time,
    last_row_count: dataset.last_execution?.[0]?.row_count
  }));
}

/**
 * Fetches predefined query templates
 */
export async function fetchPredefinedTemplates() {
  const { data, error } = await supabase
    .from("query_templates")
    .select("*")
    .eq("type", "predefined")
    .eq("is_active", true)
    .order("display_name", { ascending: true });
  
  if (error) throw error;
  
  return data || [];
}

/**
 * Fetches dependent query templates
 */
export async function fetchDependentTemplates() {
  const { data, error } = await supabase
    .from("dependent_query_templates")
    .select("*")
    .eq("is_active", true)
    .order("display_name", { ascending: true });
  
  if (error) throw error;
  
  return data || [];
}

/**
 * Creates a predefined dataset
 */
export async function createPredefinedDataset(params: {
  name: string;
  description?: string;
  sourceId: string;
  templateId: string;
}) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: params.name,
      description: params.description,
      source_id: params.sourceId,
      user_id: user.user.id,
      dataset_type: "predefined",
      template_id: params.templateId
    })
    .select();
  
  if (error) throw error;
  
  return data[0];
}

/**
 * Creates a dependent dataset
 */
export async function createDependentDataset(params: {
  name: string;
  description?: string;
  sourceId: string;
  templateId: string;
}) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: params.name,
      description: params.description,
      source_id: params.sourceId,
      user_id: user.user.id,
      dataset_type: "dependent",
      template_id: params.templateId
    })
    .select();
  
  if (error) throw error;
  
  return data[0];
}

/**
 * Fetches Shopify GraphQL schema for a source
 */
export async function fetchShopifySchema(sourceId: string) {
  const { data, error } = await supabase.functions.invoke("fetchShopifySchema", {
    body: { sourceId }
  });
  
  if (error) throw error;
  
  return data;
}

/**
 * Validates a custom GraphQL query
 */
export async function validateCustomQuery(sourceId: string, queryData: any) {
  const { data, error } = await supabase.functions.invoke("validateSourceQuery", {
    body: { 
      sourceId,
      ...queryData
    }
  });
  
  if (error) throw error;
  
  return data;
}

/**
 * Creates a custom dataset
 */
export async function createCustomDataset(params: {
  name: string;
  description?: string;
  sourceId: string;
  query: string;
  resourceType: string;
  selectedFields?: string[];
}) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: params.name,
      description: params.description,
      source_id: params.sourceId,
      user_id: user.user.id,
      dataset_type: "custom",
      custom_query: params.query,
      custom_fields: params.selectedFields ? params.selectedFields : undefined,
      parameters: {
        resourceType: params.resourceType
      }
    })
    .select();
  
  if (error) throw error;
  
  return data[0];
}

/**
 * Executes a dataset
 */
export async function executeDataset(datasetId: string) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  // Get dataset type
  const { data: dataset, error: datasetError } = await supabase
    .from("user_datasets")
    .select("dataset_type")
    .eq("id", datasetId)
    .single();
  
  if (datasetError) throw datasetError;
  
  // Call the appropriate function based on dataset type
  let functionName;
  switch (dataset.dataset_type) {
    case "predefined":
      functionName = "Pre_ExecuteDataset";
      break;
    case "dependent":
      functionName = "Dep_ExecuteDataset";
      break;
    case "custom":
      functionName = "Cust_ExecuteDataset";
      break;
    default:
      throw new Error(`Unsupported dataset type: ${dataset.dataset_type}`);
  }
  
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { 
      datasetId,
      userId: user.user.id
    }
  });
  
  if (error) throw error;
  
  return data;
}

/**
 * Fetches dataset preview
 */
export async function fetchDatasetPreview(executionId: string) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase.functions.invoke("Dataset_Preview", {
    body: { 
      executionId,
      userId: user.user.id,
      limit: 20
    }
  });
  
  if (error) throw error;
  
  return data;
}

/**
 * Exports dataset to a specific format
 */
export async function exportDataset(executionId: string, format: string) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase.functions.invoke("Dataset_Export", {
    body: { 
      executionId,
      userId: user.user.id,
      format
    }
  });
  
  if (error) throw error;
  
  return data;
}

/**
 * Deletes a dataset
 */
export async function deleteDataset(datasetId: string) {
  const { error } = await supabase
    .from("user_datasets")
    .delete()
    .eq("id", datasetId);
  
  if (error) throw error;
  
  return true;
}
