
/**
 * Converts an array of objects to CSV format following RFC 4180 standard
 * @param data Array of objects to convert to CSV
 * @returns CSV string
 */
export function convertToCSV(data: Record<string, any>[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.map(escapeCSVValue).join(',');
  
  // Create data rows
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return escapeCSVValue(formatValue(value));
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...rows].join('\r\n'); // Use CRLF line breaks as per RFC 4180
}

/**
 * Escapes a value for CSV output according to RFC 4180
 * @param value The value to escape
 * @returns Escaped value
 */
function escapeCSVValue(value: any): string {
  const stringValue = String(value ?? '');
  
  // If the value contains commas, newlines, or quotes, wrap it in quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r') || stringValue.includes('"')) {
    // Double up any quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Formats a value for CSV output
 * @param value The value to format
 * @returns Formatted value
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    // Handle arrays specially
    if (Array.isArray(value)) {
      // Format array elements and join with semicolons
      return value.map(item => formatValue(item)).join(';');
    }
    
    // Convert objects to JSON
    return JSON.stringify(value);
  }
  
  // For dates, ensure they're in a standard format
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Convert other types to string
  return String(value);
}
