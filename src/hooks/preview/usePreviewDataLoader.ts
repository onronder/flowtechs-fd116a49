
import { useState, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { fetchDirectExecutionData } from "@/api/datasets/execution/directDatabaseAccess";
import { supabase } from "@/integrations/supabase/client";
import { DataSourceType, PreviewOptions, PreviewData } from "./previewTypes";
import { Json } from "@/integrations/supabase/types";

interface ExecutionData {
  status: string;
  start_time?: string;
  end_time?: string;
  row_count?: number;
  execution_time_ms?: number;
  error_message?: string;
  api_call_count?: number;
  dataset?: {
    id: string;
    name: string;
    type: string;
  };
  data?: any[];
}

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
            
            // Safely cast the data to our expected structure
            const execution = directData as ExecutionData;
            
            // Create a properly structured PreviewData object
            const transformedData: PreviewData = {
              status: execution.status || 'completed',
              execution: {
                id: executionId,
                startTime: execution.start_time || new Date().toISOString(),
                endTime: execution.end_time,
                rowCount: execution.row_count,
                executionTimeMs: execution.execution_time_ms,
                apiCallCount: execution.api_call_count
              },
              dataset: execution.dataset || {
                id: '',
                name: 'Unknown Dataset',
                type: ''
              },
              preview: Array.isArray(execution.data) ? execution.data.slice(0, 5) : [],
              columns: [],
              totalCount: execution.row_count || 0,
              error: execution.error_message
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
              const executionData = execution as {
                id: string;
                status: string;
                start_time?: string;
                end_time?: string;
                row_count?: number;
                error_message?: string;
              };
              
              return {
                status: executionData.status,
                execution: {
                  id: executionData.id,
                  startTime: executionData.start_time || new Date().toISOString(),
                  endTime: executionData.end_time,
                  rowCount: executionData.row_count
                },
                totalCount: executionData.row_count || 0,
                preview: [],
                columns: [],
                error: executionData.error_message
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
