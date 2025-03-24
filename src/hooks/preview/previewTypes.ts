
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
