
/**
 * Shared types for dataset preview functionality
 */

export interface PreviewData {
  status: string;
  execution?: {
    id: string;
    startTime: string;
    endTime?: string;
    rowCount?: number;
    executionTimeMs?: number;
    apiCallCount?: number;
  };
  dataset?: {
    id: string;
    name: string;
    type: string;
    template?: {
      name: string;
    };
  };
  columns?: Array<{ key: string; label: string }>;
  preview?: any[];
  totalCount?: number;
  error?: string;
}

export type DataSourceType = 'preview' | 'direct' | 'minimal';

export interface PreviewOptions {
  limit?: number;
  maxRetries?: number;
  retryDelay?: number;
  checkStatus?: boolean;
}

export interface StuckExecutionState {
  isStuck: boolean;
  executionId?: string;
  startTime?: string;
}
