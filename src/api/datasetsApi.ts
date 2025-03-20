// src/api/datasetsApi.ts
import { supabase } from "@/integrations/supabase/client";

// Fetch user datasets
export async function fetchUserDatasets() {
  const { data, error } = await supabase
    .from("user_datasets")
    .select(`
      *,
      source:source_id(*),
      template:template_id(*),
      last_execution:dataset_executions(
        id,
        status,
        start_time,
        end_time,
        row_count,
        execution_time_ms
      )
    `)
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

// Fetch predefined query templates
export async function fetchPredefinedTemplates() {
  const { data, error } = await supabase
    .from("query_templates")
    .select("*")
    .eq("type", "predefined")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data;
}

// Fetch dependent query templates
export async function fetchDependentTemplates() {
  const { data, error } = await supabase
    .from("dependent_query_templates")
    .select("*")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data;
}

// Create a predefined dataset
export async function createPredefinedDataset(datasetData) {
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: datasetData.name,
      description: datasetData.description,
      source_id: datasetData.sourceId,
      dataset_type: "predefined",
      template_id: datasetData.templateId
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Create a dependent dataset
export async function createDependentDataset(datasetData) {
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: datasetData.name,
      description: datasetData.description,
      source_id: datasetData.sourceId,
      dataset_type: "dependent",
      template_id: datasetData.templateId
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Create a custom dataset
export async function createCustomDataset(datasetData) {
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: datasetData.name,
      description: datasetData.description,
      source_id: datasetData.sourceId,
      dataset_type: "custom",
      custom_query: datasetData.query,
      custom_fields: datasetData.selectedFields,
      parameters: {
        resourceType: datasetData.resourceType
      }
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Execute dataset
export async function executeDataset(datasetId) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Execute",
    { body: { datasetId } }
  );

  if (error) throw error;
  return data;
}

// Fetch dataset preview
export async function fetchDatasetPreview(executionId) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Preview",
    { body: { executionId } }
  );

  if (error) throw error;
  return data;
}

// Export dataset
export async function exportDataset(executionId, format = 'json', saveToStorage = false) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Export",
    {
      body: { executionId, format },
      headers: { 'Save-To-Storage': saveToStorage ? 'true' : 'false' }
    }
  );

  if (error) throw error;
  return data;
}

// Delete dataset
export async function deleteDataset(datasetId) {
  const { error } = await supabase
    .from("user_datasets")
    .delete()
    .eq("id", datasetId);

  if (error) throw error;
  return true;
}

// Fetch Shopify GraphQL schema for custom queries
export async function fetchShopifySchema(sourceId) {
  const { data, error } = await supabase.functions.invoke(
    "Cust_FetchSchema",
    { body: { sourceId } }
  );

  if (error) throw error;
  return data;
}

// Validate custom query
export async function validateCustomQuery(sourceId, queryData) {
  const { data, error } = await supabase.functions.invoke(
    "Cust_ValidateQuery",
    { body: { sourceId, ...queryData } }
  );

  if (error) throw error;
  return data;
}