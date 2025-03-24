
import { processCompletedExecution } from "./dataFormatter.ts";
import { checkForStuckExecution } from "./stuckExecutionDetector.ts";

/**
 * Builds a standardized response object from execution data
 */
export function buildExecutionResponse(execution: any, limit: number = 5, checkStatus: boolean = false) {
  // First check for stuck execution
  const stuckCheck = checkForStuckExecution(execution, checkStatus);
  if (stuckCheck.isStuck) {
    return {
      status: 'stuck',
      execution: stuckCheck.execution,
      dataset: execution.dataset,
      preview: [],
      totalCount: 0,
      error: "Execution appears to be stuck"
    };
  }
  
  // Process based on execution status
  if (execution.status === "completed") {
    const processedData = processCompletedExecution(execution, limit);
    
    if (processedData) {
      return {
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
    }
  }
  
  // Return basic info for incomplete or failed executions
  console.log(`Returning data for ${execution.status} execution`);
  return {
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
}
