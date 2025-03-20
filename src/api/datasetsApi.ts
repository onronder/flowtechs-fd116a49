
// src/api/datasetsApi.ts
// This file now re-exports from the sub-modules to maintain backward compatibility

// Import and re-export from common module
export { 
  fetchUserDatasets,
  deleteDataset
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
  getDatasetExports
} from "./datasets/datasetExecutionApi";

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
