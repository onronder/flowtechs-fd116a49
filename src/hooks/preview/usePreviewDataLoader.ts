
import { useState, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { fetchDirectExecutionData } from "@/api/datasets/execution/directDatabaseAccess";
import { supabase } from "@/integrations/supabase/client";
import { DataSourceType, PreviewOptions, PreviewData, ExecutionData } from "./previewTypes";
import { Json } from "@/integrations/supabase/types";

export function usePreviewDataLoader() {
  const [dataSource, setDataSource] = useState<DataSourceType>('preview');
  
  const loadPreviewData = useCallback(async (
    executionId: string, 
    options: PreviewOptions = {}
  ): Promise<PreviewData> => {
    if (!executionId) throw new Error("Execution ID is required");
    
    console.log(`[Preview] Fetching preview data for execution ID: ${executionId}, options:`, options);
    
    try {
      // Check if user is authenticated first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("[Preview] No active session found");
        throw new Error("Authentication required to view preview data");
      }
      
      // Try the standard preview endpoint first
      try {
        console.log("[Preview] Attempting to fetch data from Dataset_Preview edge function");
        const data = await fetchDatasetPreview(executionId, {
          ...options,
          checkStatus: options.checkStatus || false
        });
        setDataSource('preview');
        console.log("[Preview] Preview data received successfully from edge function");
        return data as PreviewData;
      } catch (previewError) {
        console.error("[Preview] Error loading from preview API:", previewError);
        
        // Try direct database access as fallback
        try {
          console.log("[Preview] Trying direct database access as fallback");
          const directData = await fetchDirectExecutionData(executionId);
          
          if (directData) {
            console.log("[Preview] Successfully retrieved data directly from database");
            setDataSource('direct');
            
            // Type checking before casting
            if (typeof directData !== 'object' || directData === null || Array.isArray(directData)) {
              throw new Error("Invalid data format from direct database access");
            }
            
            // Safely cast the data to our expected structure
            const executionData = directData as unknown as ExecutionData;
            
            // Validate the required properties
            if (!('status' in executionData)) {
              throw new Error("Missing status in execution data");
            }
            
            // Create a properly structured PreviewData object
            const transformedData: PreviewData = {
              status: executionData.status || 'completed',
              execution: {
                id: executionId,
                startTime: executionData.start_time || new Date().toISOString(),
                endTime: executionData.end_time,
                rowCount: executionData.row_count,
                executionTimeMs: executionData.execution_time_ms,
                apiCallCount: executionData.api_call_count
              },
              dataset: executionData.dataset || {
                id: '',
                name: 'Unknown Dataset',
                type: ''
              },
              preview: Array.isArray(executionData.data) ? executionData.data.slice(0, 5) : [],
              columns: [],
              totalCount: executionData.row_count || 0,
              error: executionData.error_message
            };
            
            console.log("[Preview] Transformed direct data:", transformedData);
            return transformedData;
          } else {
            throw new Error("No data available from direct database access");
          }
        } catch (directError) {
          console.error("[Preview] Fallback direct data fetch also failed:", directError);
          
          // As a last resort, try querying the database directly for just the execution status
          try {
            console.log("[Preview] Attempting minimal execution data fetch");
            // Check if user is authenticated first
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error("Authentication required to view preview data");
            }
            
            const { data: execution, error } = await supabase
              .from("dataset_executions")
              .select("id, status, start_time, end_time, row_count, error_message")
              .eq("id", executionId)
              .maybeSingle();
            
            if (!error && execution) {
              console.log("[Preview] Retrieved minimal execution data:", execution);
              setDataSource('minimal');
              
              // Safely cast the database result
              return {
                status: execution.status,
                execution: {
                  id: execution.id,
                  startTime: execution.start_time || new Date().toISOString(),
                  endTime: execution.end_time,
                  rowCount: execution.row_count
                },
                totalCount: execution.row_count || 0,
                preview: [],
                columns: [],
                error: execution.error_message
              };
            } else {
              throw new Error(`Failed to retrieve minimal execution data: ${error?.message}`);
            }
          } catch (minimalErr) {
            console.error("[Preview] Even minimal data fetch failed:", minimalErr);
            throw minimalErr;
          }
        }
      }
    } catch (err) {
      console.error("[Preview] Error in loadPreviewData:", err);
      throw err;
    }
  }, []);
  
  return {
    loadPreviewData,
    dataSource
  };
}
