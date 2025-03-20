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

// Helper function to get the current user's ID
async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new Error("User not authenticated");
  }
  return data.user.id;
}

// Fetch user datasets
export async function fetchUserDatasets() {
  try {
    // First, fetch datasets
    const { data: datasets, error: datasetsError } = await supabase
      .from("user_datasets")
      .select(`
        *,
        source:source_id(*)
      `)
      .order("created_at", { ascending: false });
      
    if (datasetsError) throw datasetsError;
    
    if (!datasets || datasets.length === 0) {
      return [];
    }
    
    // Then, fetch most recent execution for each dataset separately
    const datasetIds = datasets.map(d => d.id);
    
    const { data: executions, error: executionsError } = await supabase
      .from("dataset_executions")
      .select(`
        id,
        dataset_id,
        status,
        start_time,
        end_time,
        row_count,
        execution_time_ms
      `)
      .in("dataset_id", datasetIds)
      .order("end_time", { ascending: false });
      
    if (executionsError) {
      console.error("Error fetching executions:", executionsError);
      // Continue without execution data
    }
    
    // Map executions to datasets
    const executionsByDataset = {};
    if (executions) {
      executions.forEach(exec => {
        if (!executionsByDataset[exec.dataset_id]) {
          executionsByDataset[exec.dataset_id] = [];
        }
        executionsByDataset[exec.dataset_id].push(exec);
      });
    }
    
    // Fetch schedules for each dataset
    const { data: schedules, error: schedulesError } = await supabase
      .from("dataset_schedules")
      .select(`
        id,
        dataset_id,
        schedule_type,
        next_run_time,
        is_active
      `)
      .in("dataset_id", datasetIds);
      
    if (schedulesError) {
      console.error("Error fetching schedules:", schedulesError);
      // Continue without schedule data
    }
    
    // Map schedules to datasets
    const schedulesByDataset = {};
    if (schedules) {
      schedules.forEach(schedule => {
        schedulesByDataset[schedule.dataset_id] = schedule;
      });
    }
    
    // Merge datasets with executions and schedules
    return datasets.map(dataset => {
      const datasetExecutions = executionsByDataset[dataset.id] || [];
      const lastExecution = datasetExecutions.length > 0 ? datasetExecutions[0] : null;
      const schedule = schedulesByDataset[dataset.id] || null;
      
      return {
        ...dataset,
        last_execution_id: lastExecution?.id,
        last_execution_time: lastExecution?.end_time,
        last_row_count: lastExecution?.row_count,
        schedule: schedule ? {
          id: schedule.id,
          type: schedule.schedule_type,
          next_run_time: schedule.next_run_time,
          is_active: schedule.is_active
        } : null
      };
    });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return [];
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

// Add this function to match the import in NewDatasetModal.tsx
export async function fetchDatasetTemplates() {
  // Just return predefined templates for now
  return fetchPredefinedTemplates();
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
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from("user_datasets")
      .insert({
        name: datasetData.name,
        description: datasetData.description || "",
        source_id: datasetData.sourceId,
        dataset_type: "predefined",
        template_id: datasetData.templateId,
        user_id: userId
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
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from("user_datasets")
      .insert({
        name: datasetData.name,
        description: datasetData.description || "",
        source_id: datasetData.sourceId,
        dataset_type: "dependent",
        template_id: datasetData.templateId,
        user_id: userId
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
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from("user_datasets")
      .insert({
        name: datasetData.name,
        description: datasetData.description || "",
        source_id: datasetData.sourceId,
        dataset_type: "custom",
        custom_query: datasetData.query,
        custom_fields: datasetData.selectedFields,
        parameters: {
          resourceType: datasetData.resourceType
        },
        user_id: userId
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating custom dataset:", error);
    throw error;
  }
}

// Add this function to match the import in PredefinedDatasetForm.tsx
export async function createDatasetFromTemplate(datasetData: PredefinedDataset) {
  return createPredefinedDataset(datasetData);
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
export async function scheduleDatasetExecution(datasetId: string, schedule: { 
  type: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  value?: string;
  date?: string;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
}) {
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

// Get dataset schedules
export async function getDatasetSchedules(datasetId?: string) {
  try {
    let query = supabase
      .from("dataset_schedules")
      .select(`
        id,
        dataset_id,
        schedule_type,
        next_run_time,
        is_active,
        parameters,
        dataset:dataset_id(name)
      `)
      .order("next_run_time", { ascending: true });
      
    if (datasetId) {
      query = query.eq("dataset_id", datasetId);
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
}

// Delete dataset schedule
export async function deleteDatasetSchedule(scheduleId: string) {
  try {
    const { error } = await supabase
      .from("dataset_schedules")
      .delete()
      .eq("id", scheduleId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting schedule:", error);
    throw error;
  }
}

// Toggle dataset schedule activation
export async function toggleScheduleActivation(scheduleId: string, isActive: boolean) {
  try {
    const { data, error } = await supabase
      .from("dataset_schedules")
      .update({ is_active: isActive })
      .eq("id", scheduleId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error toggling schedule activation:", error);
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
