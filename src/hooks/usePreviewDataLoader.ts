
import { useState, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { fetchDirectExecutionData } from "@/api/datasets/execution/directDatabaseAccess";
import { supabase } from "@/integrations/supabase/client";

export function usePreviewDataLoader() {
  const [dataSource, setDataSource] = useState<'preview' | 'direct'>('preview');
  
  const loadPreviewData = useCallback(async (executionId: string, options: { limit?: number; maxRetries?: number; retryDelay?: number } = {}) => {
    if (!executionId) throw new Error("Execution ID is required");
    
    console.log(`[Preview] Fetching preview data for execution ID: ${executionId}`);
    
    try {
      // Try the standard preview endpoint first
      const data = await fetchDatasetPreview(executionId, options);
      setDataSource('preview');
      console.log("[Preview] Preview data received:", data);
      
      return data;
    } catch (err) {
      console.error("[Preview] Error loading from preview API:", err);
      
      // Try direct database access as fallback
      try {
        console.log("[Preview] Trying direct database access as fallback");
        const directData = await fetchDirectExecutionData(executionId);
        
        if (directData) {
          console.log("[Preview] Successfully retrieved data directly from database");
          setDataSource('direct');
          return directData;
        }
      } catch (fallbackErr) {
        console.error("[Preview] Fallback direct data fetch also failed:", fallbackErr);
        
        // As a last resort, try querying the database directly for just the execution status
        try {
          const { data: execution, error } = await supabase
            .from("dataset_executions")
            .select("id, status, start_time, end_time, row_count")
            .eq("id", executionId)
            .single();
          
          if (!error && execution) {
            console.log("[Preview] Retrieved minimal execution data");
            return {
              status: execution.status,
              execution: {
                id: execution.id,
                startTime: execution.start_time,
                endTime: execution.end_time,
                rowCount: execution.row_count
              },
              totalCount: execution.row_count || 0,
              preview: [],
              columns: []
            };
          }
        } catch (minimalErr) {
          console.error("[Preview] Even minimal data fetch failed:", minimalErr);
        }
      }
      
      // All methods failed, rethrow the original error
      throw err;
    }
  }, []);
  
  return {
    loadPreviewData,
    dataSource
  };
}
