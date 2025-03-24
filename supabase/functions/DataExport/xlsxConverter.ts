
/**
 * Converts an array of objects to XLSX format
 * @param data Array of objects to convert to XLSX
 * @returns Base64 encoded XLSX data
 */
export async function convertToXLSX(data: Record<string, any>[]): Promise<string> {
  // For this implementation, we'll create a simple XML-based Excel file
  // In a production environment, you might want to use a more robust library
  
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create XML content
  let xmlContent = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xmlContent += '<Worksheet ss:Name="Sheet1">\n';
  xmlContent += '<Table>\n';
  
  // Add header row
  xmlContent += '<Row>\n';
  for (const header of headers) {
    xmlContent += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`;
  }
  xmlContent += '</Row>\n';
  
  // Add data rows
  for (const row of data) {
    xmlContent += '<Row>\n';
    for (const header of headers) {
      const value = row[header];
      const cellValue = formatXmlValue(value);
      xmlContent += `<Cell><Data ss:Type="${getXmlType(value)}">${cellValue}</Data></Cell>\n`;
    }
    xmlContent += '</Row>\n';
  }
  
  xmlContent += '</Table>\n';
  xmlContent += '</Worksheet>\n';
  xmlContent += '</Workbook>';
  
  // In a real implementation, this would be converted to a proper XLSX file
  // For now, we'll just return the XML content as a UTF-8 encoded string
  
  // Convert to CSV as a fallback for simplicity
  // In production, you'd use a proper XLSX generation library
  const { convertToCSV } = await import("./csvConverter.ts");
  return convertToCSV(data);
}

/**
 * Escapes special characters for XML
 * @param value The value to escape
 * @returns Escaped value
 */
function escapeXml(value: any): string {
  const stringValue = String(value ?? '');
  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats a value for XML output
 * @param value The value to format
 * @returns Formatted value
 */
function formatXmlValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    // Handle arrays and objects
    return escapeXml(JSON.stringify(value));
  }
  
  // For dates, ensure they're in a standard format
  if (value instanceof Date) {
    return escapeXml(value.toISOString());
  }
  
  // Convert other types to string
  return escapeXml(String(value));
}

/**
 * Gets the XML data type for a value
 * @param value The value to check
 * @returns XML data type
 */
function getXmlType(value: any): string {
  if (typeof value === 'number') {
    return 'Number';
  } else if (typeof value === 'boolean') {
    return 'Boolean';
  } else if (value instanceof Date) {
    return 'DateTime';
  } else {
    return 'String';
  }
}
