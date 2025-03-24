import { processCompletedExecution } from "./dataFormatter.ts";
import { checkForStuckExecution } from "./stuckExecutionDetector.ts";

/**
 * Redacts sensitive information from dataset execution data
 */
function redactSensitiveData(data: any): any {
  // Clone the data to avoid modifying the original
  const secureData = JSON.parse(JSON.stringify(data));
  
  // If dataset has source information, secure it
  if (secureData.dataset && secureData.dataset.source) {
    const source = secureData.dataset.source;
    
    // Remove sensitive fields from source config
    if (source.config) {
      // Keep only non-sensitive fields
      const safeConfig = {
        storeName: source.config.storeName,
        domain: source.config.domain,
        apiVersion: source.config.apiVersion || source.config.api_version
      };
      
      // Replace the original config with the safe version
      source.config = safeConfig;
    }
  }
  
  return secureData;
}

/**
 * Builds a standardized response object from execution data
 */
export function buildExecutionResponse(
  execution: any, 
  limit: number = 5, 
  checkStatus: boolean = false,
  secureMode: boolean = true // Default to secure mode
) {
  // First check for stuck execution
  const stuckCheck = checkForStuckExecution(execution, checkStatus);
  if (stuckCheck.isStuck) {
    const response = {
      status: 'stuck',
      execution: stuckCheck.execution,
      dataset: execution.dataset,
      preview: [],
      totalCount: 0,
      error: "Execution appears to be stuck"
    };
    
    return secureMode ? redactSensitiveData(response) : response;
  }
  
  // Process based on execution status
  if (execution.status === "completed") {
    const processedData = processCompletedExecution(execution, limit);
    
    if (processedData) {
      const response = {
        status: execution.status,
        execution: {
          id: execution.id,
          startTime: execution.start_time,
          endTime: execution.end_time,
          rowCount: execution.row_count,
          executionTimeMs: execution.execution_time_ms,
          apiCallCount: execution.metadata?.api_call_count
        },
        dataset: execution.dataset,
        columns: processedData.columns,
        preview: processedData.preview,
        totalCount: processedData.totalCount,
      };
      
      return secureMode ? redactSensitiveData(response) : response;
    }
  }
  
  // Return basic info for incomplete or failed executions
  console.log(`Returning data for ${execution.status} execution`);
  const response = {
    status: execution.status,
    execution: {
      id: execution.id,
      startTime: execution.start_time,
      endTime: execution.end_time
    },
    dataset: execution.dataset,
    columns: [],
    preview: [],
    totalCount: 0,
    error: execution.error_message
  };
  
  return secureMode ? redactSensitiveData(response) : response;
}
