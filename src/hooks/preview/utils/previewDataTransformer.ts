
import { PreviewData, ExecutionData } from "../previewTypes";

/**
 * Transforms direct database execution data into the PreviewData format
 */
export function transformExecutionDataToPreviewData(
  executionData: ExecutionData, 
  executionId: string
): PreviewData {
  // Create a properly structured PreviewData object
  return {
    status: executionData.status || 'completed',
    execution: {
      id: executionId,
      startTime: executionData.start_time || new Date().toISOString(),
      endTime: executionData.end_time,
      rowCount: executionData.row_count,
      executionTimeMs: executionData.execution_time_ms,
      apiCallCount: executionData.api_call_count
    },
    dataset: executionData.dataset || {
      id: '',
      name: 'Unknown Dataset',
      type: ''
    },
    preview: Array.isArray(executionData.data) ? executionData.data.slice(0, 5) : [],
    columns: [],
    totalCount: executionData.row_count || 0,
    error: executionData.error_message
  };
}

/**
 * Creates minimal preview data from basic execution information
 */
export function createMinimalPreviewData(execution: any): PreviewData {
  return {
    status: execution.status,
    execution: {
      id: execution.id,
      startTime: execution.start_time || new Date().toISOString(),
      endTime: execution.end_time,
      rowCount: execution.row_count
    },
    totalCount: execution.row_count || 0,
    preview: [],
    columns: [],
    error: execution.error_message
  };
}
