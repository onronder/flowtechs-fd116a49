
/**
 * Extract columns from a data row
 */
export function extractColumns(row: any): Array<{ key: string; label: string }> {
  if (!row) return [];
  
  try {
    const keys = Object.keys(row);
    console.log(`Extracted ${keys.length} columns from data row`);
    
    return keys.map(key => ({
      key,
      label: formatColumnLabel(key)
    }));
  } catch (err) {
    console.error("Error extracting columns:", err);
    return [];
  }
}

/**
 * Format column labels for display
 */
export function formatColumnLabel(key: string): string {
  // Convert camelCase or snake_case to Title Case
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Process the execution data for completed executions
 */
export function processCompletedExecution(execution: any, limit: number = 5) {
  if (execution.status !== "completed" || !execution.data) {
    return null;
  }
  
  try {
    // Safely handle data retrieval and slicing
    let dataToProcess = [];
    let totalDataLength = 0;
    
    if (Array.isArray(execution.data)) {
      // Get the total length for reporting
      totalDataLength = execution.data.length;
      
      // Only take the requested number of rows to reduce memory usage and processing time
      dataToProcess = execution.data.slice(0, limit);
      
      console.log(`Processing ${dataToProcess.length} out of ${totalDataLength} rows`);
    } else {
      console.warn(`Execution data is not an array: ${typeof execution.data}`);
      dataToProcess = [];
    }
    
    // Extract columns from the first row
    const columns = dataToProcess.length > 0
      ? extractColumns(dataToProcess[0])
      : [];
    
    // Log sample data row for debugging (first row, safely limit object depth)
    if (dataToProcess.length > 0) {
      try {
        const sampleRow = dataToProcess[0];
        console.log(`Sample data row keys: ${Object.keys(sampleRow).join(', ')}`);
      } catch (err) {
        console.error("Error logging sample row:", err);
      }
    }
    
    console.log(`Returning preview with ${dataToProcess.length} rows and ${columns.length} columns`);
    
    return {
      columns,
      preview: dataToProcess,
      totalCount: execution.row_count || totalDataLength
    };
  } catch (error) {
    console.error("Error processing completed execution:", error);
    return null;
  }
}
