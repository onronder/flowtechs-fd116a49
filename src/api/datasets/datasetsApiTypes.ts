
import { supabase } from "@/integrations/supabase/client";

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
