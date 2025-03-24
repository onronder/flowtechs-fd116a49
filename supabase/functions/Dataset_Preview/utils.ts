
/**
 * Utility functions for Dataset_Preview
 */

/**
 * Parses and validates the request body
 */
export async function parseRequestBody(req: Request): Promise<any | null> {
  try {
    const text = await req.text();
    console.log("Raw request body:", text);
    
    if (!text || text.trim() === '') {
      console.error("Empty request body");
      return null;
    }
    
    try {
      const body = JSON.parse(text);
      console.log("Parsed request body:", body);
      return body;
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error reading request body:", error);
    return null;
  }
}

/**
 * Creates a standardized timestamp for logging
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Safely parse JSON without throwing
 */
export function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
}

/**
 * Format an error for consistent logging
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? '\n' + error.stack : ''}`;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  try {
    return JSON.stringify(error, null, 2);
  } catch (e) {
    return `[Unstringifiable Error]: ${Object.prototype.toString.call(error)}`;
  }
}

/**
 * Extract preview data from execution results
 */
export function extractPreviewData(execution: any, dataset: any = null, template: any = null): any {
  if (!execution) {
    return {
      status: 'failed',
      error: 'Execution not found',
      preview: [],
      columns: [],
      totalCount: 0
    };
  }
  
  // Return error information if execution failed
  if (execution.status === 'failed') {
    return {
      status: 'failed',
      error: execution.error_message || 'Execution failed without specific error message',
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time
      },
      preview: [],
      columns: [],
      totalCount: 0,
      dataset: dataset ? {
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type,
        template: template ? {
          id: template.id,
          name: template.name
        } : null
      } : null
    };
  }
  
  // For pending or running executions
  if (execution.status === 'pending' || execution.status === 'running') {
    return {
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time
      },
      preview: [],
      columns: [],
      totalCount: 0,
      dataset: dataset ? {
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type,
        template: template ? {
          id: template.id,
          name: template.name
        } : null
      } : null
    };
  }
  
  // Extract data for completed executions
  try {
    const data = execution.data || [];
    const totalCount = execution.row_count || data.length || 0;
    
    // Get a sample for preview (first 100 rows)
    const preview = data.slice(0, 100);
    
    // Extract column info from the first row
    let columns: string[] = [];
    if (preview.length > 0) {
      const firstRow = preview[0];
      columns = Object.keys(firstRow).filter(key => {
        // Filter out any complex nested objects that would be difficult to display
        const value = firstRow[key];
        return value === null || 
               typeof value !== 'object' || 
               Array.isArray(value) ||
               (typeof value === 'object' && Object.keys(value).length < 5);
      });
    }
    
    return {
      status: 'completed',
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: totalCount,
        executionTime: execution.execution_time_ms,
        apiCallCount: execution.api_call_count
      },
      preview,
      columns,
      totalCount,
      dataset: dataset ? {
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type,
        template: template ? {
          id: template.id,
          name: template.name
        } : null
      } : null
    };
  } catch (error) {
    console.error("Error extracting preview data:", error);
    return {
      status: 'error',
      error: `Error extracting preview data: ${formatError(error)}`,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time
      },
      preview: [],
      columns: [],
      totalCount: execution.row_count || 0,
      dataset: dataset ? {
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type
      } : null
    };
  }
}
