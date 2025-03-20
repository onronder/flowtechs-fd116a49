// src/api/datasetsApi.ts
import { supabase } from "@/integrations/supabase/client";

// Type definitions
interface DatasetBase {
  name: string;
  description?: string;
  sourceId: string;
}

interface PredefinedDataset extends DatasetBase {
  templateId: string;
}

interface DependentDataset extends DatasetBase {
  templateId: string;
}

interface CustomDataset extends DatasetBase {
  query: string;
  selectedFields: string[];
  resourceType: string;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  saveToStorage?: boolean;
}

// Fetch user datasets
export async function fetchUserDatasets() {
  try {
    const { data, error } = await supabase
      .from("user_datasets")
      .select(`
        *,
        source:source_id(*),
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
  } catch (error) {
    console.error("Error fetching datasets:", error);
    throw error;
  }
}

// Fetch predefined query templates
export async function fetchPredefinedTemplates() {
  try {
    const { data, error } = await supabase
      .from("query_templates")
      .select("*")
      .eq("type", "predefined")
      .eq("is_active", true)
      .order("display_name", { ascending: true });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching predefined templates:", error);
    throw error;
  }
}

// Fetch dependent query templates
export async function fetchDependentTemplates() {
  try {
    const { data, error } = await supabase
      .from("dependent_query_templates")
      .select("*")
      .eq("is_active", true)
      .order("display_name", { ascending: true });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching dependent templates:", error);
    throw error;
  }
}

// Fetch Shopify GraphQL schema
export async function fetchShopifySchema(sourceId: string) {
  try {
    const { data, error } = await supabase.functions.invoke("Cust_FetchSchema", {
      body: { sourceId }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching schema:", error);
    throw error;
  }
}

// Validate custom query
export async function validateCustomQuery(sourceId: string, queryData: any) {
  try {
    const { data, error } = await supabase.functions.invoke("Cust_ValidateQuery", {
      body: { sourceId, ...queryData }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error validating query:", error);
    throw error;
  }
}

// Create predefined dataset
export async function createPredefinedDataset(datasetData: PredefinedDataset) {
  try {
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
  } catch (error) {
    console.error("Error creating predefined dataset:", error);
    throw error;
  }
}

// Create dependent dataset
export async function createDependentDataset(datasetData: DependentDataset) {
  try {
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
  } catch (error) {
    console.error("Error creating dependent dataset:", error);
    throw error;
  }
}

// Create custom dataset
export async function createCustomDataset(datasetData: CustomDataset) {
  try {
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
  } catch (error) {
    console.error("Error creating custom dataset:", error);
    throw error;
  }
}

// Execute dataset
export async function executeDataset(datasetId: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Execute",
      { body: { datasetId } }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error executing dataset:", error);
    throw error;
  }
}

// Execute custom dataset (separate function for direct query execution)
export async function executeCustomDataset(sourceId: string, query: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Cust_ExecuteDataset",
      { body: { sourceId, query } }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error executing custom dataset:", error);
    throw error;
  }
}

// Fetch dataset preview
export async function fetchDatasetPreview(executionId: string) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Preview",
      { body: { executionId } }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching dataset preview:", error);
    throw error;
  }
}

// Export dataset
export async function exportDataset(executionId: string, options: ExportOptions = { format: 'json' }) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Export",
      {
        body: { 
          executionId, 
          format: options.format 
        },
        headers: { 
          'Save-To-Storage': options.saveToStorage ? 'true' : 'false' 
        }
      }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error exporting dataset:", error);
    throw error;
  }
}

// Delete dataset
export async function deleteDataset(datasetId: string) {
  try {
    const { error } = await supabase
      .from("user_datasets")
      .delete()
      .eq("id", datasetId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
}

// Get dataset execution history
export async function getDatasetExecutionHistory(datasetId: string) {
  try {
    const { data, error } = await supabase
      .from("dataset_executions")
      .select("*")
      .eq("dataset_id", datasetId)
      .order("start_time", { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching execution history:", error);
    throw error;
  }
}

// Get dataset execution details
export async function getExecutionDetails(executionId: string) {
  try {
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
  } catch (error) {
    console.error("Error fetching execution details:", error);
    throw error;
  }
}

// Schedule dataset execution
export async function scheduleDatasetExecution(datasetId: string, schedule: { type: string, value?: string }) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Schedule",
      { body: { datasetId, schedule } }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error scheduling dataset:", error);
    throw error;
  }
}

// Get dataset exports
export async function getDatasetExports(executionId: string) {
  try {
    const { data, error } = await supabase
      .from("user_storage_exports")
      .select("*")
      .eq("execution_id", executionId)
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching exports:", error);
    throw error;
  }
}