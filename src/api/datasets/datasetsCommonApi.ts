
// src/api/datasets/datasetsCommonApi.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to get the current user's ID
 */
export async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new Error("User not authenticated");
  }
  return data.user.id;
}

/**
 * Fetch user datasets with execution and schedule info
 */
export async function fetchUserDatasets() {
  try {
    // First, fetch datasets
    const { data: datasets, error: datasetsError } = await supabase
      .from("user_datasets")
      .select(`
        *,
        source:source_id(*)
      `)
      .order("created_at", { ascending: false });
      
    if (datasetsError) throw datasetsError;
    
    if (!datasets || datasets.length === 0) {
      return [];
    }
    
    // Then, fetch most recent execution for each dataset separately
    const datasetIds = datasets.map(d => d.id);
    
    const { data: executions, error: executionsError } = await supabase
      .from("dataset_executions")
      .select(`
        id,
        dataset_id,
        status,
        start_time,
        end_time,
        row_count,
        execution_time_ms
      `)
      .in("dataset_id", datasetIds)
      .order("end_time", { ascending: false });
      
    if (executionsError) {
      console.error("Error fetching executions:", executionsError);
      // Continue without execution data
    }
    
    // Map executions to datasets
    const executionsByDataset = {};
    if (executions) {
      executions.forEach(exec => {
        if (!executionsByDataset[exec.dataset_id]) {
          executionsByDataset[exec.dataset_id] = [];
        }
        executionsByDataset[exec.dataset_id].push(exec);
      });
    }
    
    // Fetch schedules for each dataset
    const { data: schedules, error: schedulesError } = await supabase
      .from("dataset_schedules")
      .select(`
        id,
        dataset_id,
        schedule_type,
        next_run_time,
        is_active
      `)
      .in("dataset_id", datasetIds);
      
    if (schedulesError) {
      console.error("Error fetching schedules:", schedulesError);
      // Continue without schedule data
    }
    
    // Map schedules to datasets
    const schedulesByDataset = {};
    if (schedules) {
      schedules.forEach(schedule => {
        schedulesByDataset[schedule.dataset_id] = schedule;
      });
    }
    
    // Merge datasets with executions and schedules
    return datasets.map(dataset => {
      const datasetExecutions = executionsByDataset[dataset.id] || [];
      const lastExecution = datasetExecutions.length > 0 ? datasetExecutions[0] : null;
      const schedule = schedulesByDataset[dataset.id] || null;
      
      return {
        ...dataset,
        last_execution_id: lastExecution?.id,
        last_execution_time: lastExecution?.end_time,
        last_row_count: lastExecution?.row_count,
        schedule: schedule ? {
          id: schedule.id,
          type: schedule.schedule_type,
          next_run_time: schedule.next_run_time,
          is_active: schedule.is_active
        } : null
      };
    });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return [];
  }
}

/**
 * Delete dataset
 */
export async function deleteDataset(datasetId: string) {
  try {
    const { error } = await supabase
      .from("user_datasets")
      .delete()
      .eq("id", datasetId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
}
