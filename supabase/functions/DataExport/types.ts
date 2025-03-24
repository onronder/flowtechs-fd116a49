
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

export interface ExecutionData {
  id: string;
  dataset_id: string;
  status: string;
  start_time: string;
  end_time?: string;
  row_count?: number;
  execution_time_ms?: number;
  api_call_count?: number;
  dataset?: {
    name: string;
    user_id: string;
  };
}

export interface ExecutionResults {
  results: any[];
}
