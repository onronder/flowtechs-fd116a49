
export type DatasetExecution = {
  id: string;
  dataset_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time: string;
  end_time?: string;
  row_count?: number;
  execution_time_ms?: number;
  error_message?: string;
  metadata: Record<string, any>;
  data?: any;
  api_call_count?: number;
};

export type DatasetBase = {
  id: string;
  name: string;
  description?: string;
  source_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type DatasetSchedule = {
  id: string;
  dataset_id: string;
  schedule_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression: string;
  is_active: boolean;
  next_run_time?: string;
  parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type ExportOptions = {
  format: 'csv' | 'json' | 'xlsx';
  filename?: string;
  includeHeaders?: boolean;
};
