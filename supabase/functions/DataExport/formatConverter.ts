
import { ExportFormat } from "./types.ts";
import { convertToCSV } from "./csvConverter.ts";
import { convertToXLSX } from "./xlsxConverter.ts";

/**
 * Converts data to the specified format
 * @param data Data to convert
 * @param format Target format
 * @returns Converted data as string
 */
export async function convertToFormat(data: any[], format: ExportFormat): Promise<{
  exportData: string;
  contentType: string;
  fileExtension: string;
}> {
  let exportData: string;
  let contentType: string;
  let fileExtension: string;

  // Convert to the requested format
  switch (format.toLowerCase() as ExportFormat) {
    case 'csv':
      exportData = convertToCSV(data);
      contentType = "text/csv";
      fileExtension = "csv";
      break;
    case 'xlsx':
      exportData = await convertToXLSX(data);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileExtension = "xlsx";
      break;
    case 'json':
    default:
      exportData = JSON.stringify(data, null, 2);
      contentType = "application/json";
      fileExtension = "json";
      break;
  }

  return { exportData, contentType, fileExtension };
}
