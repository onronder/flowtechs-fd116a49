
// src/api/datasets/datasetsApiTypes.ts
import { Json } from "@/integrations/supabase/types";

// Type definitions
export interface DatasetBase {
  name: string;
  description?: string;
  sourceId: string;
}

export interface PredefinedDataset extends DatasetBase {
  templateId: string;
}

export interface DependentDataset extends DatasetBase {
  templateId: string;
}

export interface CustomDataset extends DatasetBase {
  query: string;
  selectedFields: string[];
  resourceType: string;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  saveToStorage?: boolean;
}

export interface DatasetSchedule {
  type: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  value?: string;
  date?: string;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
}

export interface DatasetExecution {
  id: string;
  dataset_id: string;
  status: string;
  start_time: string;
  end_time?: string;
  row_count?: number;
  execution_time_ms?: number;
  error?: string;
  dataset?: {
    name: string;
    description?: string;
    source_id: string;
  };
}

export interface DatasetScheduleEntry {
  id: string;
  dataset_id: string;
  schedule_type: string;
  next_run_time?: string;
  is_active: boolean;
  parameters?: Json;
  dataset?: {
    name: string;
  };
}
