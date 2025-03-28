export type DataSourceType = 'preview' | 'direct' | 'minimal';

export interface PreviewOptions {
  limit?: number;
  maxRetries?: number;
  retryDelay?: number;
  checkStatus?: boolean;
}

export interface PreviewExecution {
  id: string;
  startTime: string;
  endTime?: string;
  rowCount?: number;
  executionTimeMs?: number;
  apiCallCount?: number;
}

export interface PreviewDataset {
  id: string;
  name: string;
  type: string;
  template?: {
    name: string;
  };
  source?: {
    id?: string;
    name?: string;
    config?: Record<string, any>;
  };
}

export interface PreviewColumn {
  key: string;
  label: string;
}

export interface PreviewData {
  status: string;
  execution: PreviewExecution;
  dataset?: PreviewDataset;
  preview: any[];
  columns?: PreviewColumn[];
  totalCount: number;
  error?: string;
}

// Additional types for type safety in the preview components
export interface FormattedPreviewRow {
  [key: string]: any;
}

export interface StuckExecutionInfo {
  isStuck: boolean;
  since: string;
  details?: string;
}

// Type for direct database execution data
export interface ExecutionData {
  status: string;
  start_time?: string;
  end_time?: string;
  row_count?: number;
  execution_time_ms?: number;
  error_message?: string;
  api_call_count?: number;
  dataset?: {
    id: string;
    name: string;
    type: string;
  };
  data?: any[];
}
