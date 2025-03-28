
// Dataset types
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  dataset_type: 'predefined' | 'dependent' | 'custom' | 'direct_api';
  source_id: string;
  template_id?: string;
  custom_query?: string;
  parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_execution_id?: string;
  last_execution_time?: string;
  last_execution_status?: 'pending' | 'running' | 'completed' | 'failed';
  last_row_count?: number;
}

// Execution history types
export interface ExecutionHistoryItem {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time: string;
  end_time?: string;
  row_count?: number;
  execution_time_ms?: number;
  error_message?: string;
}

export interface DatasetExecution {
  id: string;
  dataset_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time: string;
  end_time?: string;
  data?: any;
  row_count?: number;
  execution_time_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  api_call_count?: number;
}
