
// src/api/datasetsApi.ts
// This file now re-exports from the sub-modules to maintain backward compatibility

// Import and re-export from common module
export { 
  fetchUserDatasets
} from "./datasets/datasetsCommonApi";

// Import and re-export from templates module
export {
  fetchPredefinedTemplates,
  fetchDependentTemplates,
  fetchDatasetTemplates
} from "./datasets/templatesApi";

// Import and re-export from creation module
export {
  createPredefinedDataset,
  createDependentDataset,
  createCustomDataset,
  createDatasetFromTemplate
} from "./datasets/datasetCreationApi";

// Import and re-export from execution module
export {
  executeDataset,
  executeCustomDataset,
  fetchDatasetPreview,
  exportDataset,
  getDatasetExecutionHistory,
  getExecutionDetails,
  getDatasetExports,
  resetStuckExecutions
} from "./datasets/execution";

// Import and re-export from scheduling module
export {
  scheduleDatasetExecution,
  getDatasetSchedules,
  deleteDatasetSchedule,
  toggleScheduleActivation
} from "./datasets/datasetSchedulingApi";

// Import and re-export from schema module
export {
  fetchShopifySchema,
  validateCustomQuery
} from "./datasets/shopifySchemaApi";

// Define fetchRecentOrdersDashboard function to use the edge function
import { supabase } from "@/integrations/supabase/client";

export async function fetchRecentOrdersDashboard(datasetId: string, params = {}) {
  try {
    // Call the edge function
    const { data, error } = await supabase.functions.invoke("pre_recent_orders_dashboard", {
      body: params
    });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error fetching recent orders dashboard:", error);
    throw error;
  }
}

// Define deleteDataset function with proper error handling
export async function deleteDataset(datasetId: string) {
  try {
    // Try to use the database function first
    const { data: fnResult, error: fnError } = await supabase.rpc(
      'delete_dataset_cascade',
      { p_dataset_id: datasetId }
    );
    
    if (fnError) {
      // If the function call fails, fall back to direct delete
      // This will work if you've set up CASCADE constraints
      const { error } = await supabase
        .from("user_datasets")
        .delete()
        .eq("id", datasetId);
        
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
}

// Re-export types for consumers
export type {
  DatasetBase,
  PredefinedDataset,
  DependentDataset,
  CustomDataset,
  ExportOptions,
  DatasetSchedule,
  DatasetExecution,
  DatasetScheduleEntry
} from "./datasets/datasetsApiTypes";
