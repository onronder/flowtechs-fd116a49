
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/types/supabase";

// Common types for dataset APIs
export type PredefinedDataset = {
  name: string;
  description?: string;
  sourceId: string;
  templateId: string; // Now using string instead of UUID for edge function names
};

export type DependentDataset = {
  name: string;
  description?: string;
  sourceId: string;
  templateId: string;
};

export type CustomDataset = {
  name: string;
  description?: string;
  sourceId: string;
  resourceType: string;
  query: string;
  selectedFields: string[];
};

// Export these types that were previously only in legacy/datasets
export type DatasetExecution = {
  id: string;
  dataset_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time: string | null;
  end_time?: string | null;
  row_count?: number | null;
  execution_time_ms?: number | null;
  error_message?: string | null;
  metadata: Json | null;
  data?: Json | null;
  api_call_count?: number | null;
  created_at?: string;
  updated_at?: string;
  dataset?: {
    created_at: string | null;
    custom_fields: Json | null;
    custom_query: string | null;
    dataset_type: string;
    description: string | null;
    id: string;
    name: string;
    source_id: string;
    template_id: string | null;
    parameters: Json | null;
    updated_at: string;
    user_id: string;
  };
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
  type: string;
  minute?: number;
  hour?: number;
  day?: number;
  month?: string;
  dayOfWeek?: string;
};

export type DatasetScheduleEntry = {
  id: string;
  dataset_id: string;
  schedule_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression: string;
  is_active: boolean;
  next_run_time?: string | null;
  parameters?: Json | null;
  created_at: string;
  updated_at: string;
  dataset?: {
    name: string;
  };
};

export type ExportOptions = {
  format: 'csv' | 'json' | 'xlsx';
  filename?: string;
  includeHeaders?: boolean;
};
