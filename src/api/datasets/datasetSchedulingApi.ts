
// src/api/datasets/datasetSchedulingApi.ts
import { supabase } from "@/integrations/supabase/client";
import { DatasetSchedule, DatasetScheduleEntry } from "./datasetsApiTypes";

/**
 * Schedule dataset execution
 */
export async function scheduleDatasetExecution(
  datasetId: string, 
  schedule: DatasetSchedule
) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Schedule",
      { body: { datasetId, schedule } }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error scheduling dataset:", error);
    throw error;
  }
}

/**
 * Get dataset schedules
 */
export async function getDatasetSchedules(datasetId?: string): Promise<DatasetScheduleEntry[]> {
  try {
    let query = supabase
      .from("dataset_schedules")
      .select(`
        id,
        dataset_id,
        schedule_type,
        next_run_time,
        is_active,
        parameters,
        dataset:dataset_id(name)
      `)
      .order("next_run_time", { ascending: true });
      
    if (datasetId) {
      query = query.eq("dataset_id", datasetId);
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
}

/**
 * Delete dataset schedule
 */
export async function deleteDatasetSchedule(scheduleId: string) {
  try {
    const { error } = await supabase
      .from("dataset_schedules")
      .delete()
      .eq("id", scheduleId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting schedule:", error);
    throw error;
  }
}

/**
 * Toggle dataset schedule activation
 */
export async function toggleScheduleActivation(scheduleId: string, isActive: boolean) {
  try {
    const { data, error } = await supabase
      .from("dataset_schedules")
      .update({ is_active: isActive })
      .eq("id", scheduleId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error toggling schedule activation:", error);
    throw error;
  }
}
