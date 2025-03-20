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
export async function createPredefinedDataset(datasetData: {
  name: string;
  description?: string;
  sourceId: string;
  templateId: string;
}) {
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
export async function createDependentDataset(datasetData: {
  name: string;
  description?: string;
  sourceId: string;
  templateId: string;
}) {
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
export async function createCustomDataset(datasetData: {
  name: string;
  description?: string;
  sourceId: string;
  query: string;
  resourceType: string;
  selectedFields: string[];
}) {
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
export async function executeDataset(datasetId: string) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Execute",
    { body: { datasetId } }
  );

  if (error) throw error;
  return data;
}

// Fetch dataset preview
export async function fetchDatasetPreview(executionId: string) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Preview",
    { body: { executionId } }
  );

  if (error) throw error;
  return data;
}

// Export dataset
export async function exportDataset(executionId: string, format = 'json', saveToStorage = false) {
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
export async function deleteDataset(datasetId: string) {
  const { error } = await supabase
    .from("user_datasets")
    .delete()
    .eq("id", datasetId);

  if (error) throw error;
  return true;
}

// Fetch Shopify GraphQL schema for custom queries
export async function fetchShopifySchema(sourceId: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Cust_FetchSchema",
      { body: { sourceId } }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching schema:", error);
    throw error;
  }
}

// Validate a custom query
export async function validateCustomQuery(
  sourceId: string, 
  queryData: { query?: string; resourceType?: string; fields?: string[] }
) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Cust_ValidateQuery",
      { body: { sourceId, ...queryData } }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error validating query:", error);
    throw error;
  }
}

// Get dataset execution details
export async function getDatasetExecutionDetails(executionId: string) {
  const { data, error } = await supabase
    .from("dataset_executions")
    .select(`
      *,
      dataset:dataset_id(*)
    `)
    .eq("id", executionId)
    .single();

  if (error) throw error;
  return data;
}

// Schedule dataset execution
export async function scheduleDatasetExecution(scheduleData: {
  datasetId: string;
  scheduleType: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  startTime?: string;
  enabled?: boolean;
}) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Schedule",
    { body: scheduleData }
  );

  if (error) throw error;
  return data;
}

// Get dataset execution history
export async function getDatasetExecutionHistory(datasetId: string, limit = 10) {
  const { data, error } = await supabase
    .from("dataset_executions")
    .select(`
      id,
      status,
      start_time,
      end_time,
      row_count,
      execution_time_ms,
      error_message
    `)
    .eq("dataset_id", datasetId)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Get user's dataset exports
export async function getUserExports(limit = 20) {
  const { data, error } = await supabase
    .from("user_storage_exports")
    .select(`
      *,
      execution:execution_id(
        dataset_id(name)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Get download URL for an export
export async function getExportDownloadUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("dataset_exports")
    .createSignedUrl(filePath, 60); // URL valid for 60 seconds

  if (error) throw error;
  return data.signedUrl;
}