
export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ExportOptions {
  executionId: string;
  format?: ExportFormat;
  fileName?: string | null;
  dataSource?: any[] | null;
}

export interface ExportResponse {
  success: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl?: string;
  data?: string;
  error?: string;
}
