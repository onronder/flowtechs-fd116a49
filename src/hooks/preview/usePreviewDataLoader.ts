
import { useState, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { fetchDirectExecutionData } from "@/api/datasets/execution/directDatabaseAccess";
import { supabase } from "@/integrations/supabase/client";
import { DataSourceType, PreviewOptions, PreviewData } from "./previewTypes";

export function usePreviewDataLoader() {
  const [dataSource, setDataSource] = useState<DataSourceType>('preview');
  
  const loadPreviewData = useCallback(async (
    executionId: string, 
    options: PreviewOptions = {}
  ): Promise<PreviewData> => {
    if (!executionId) throw new Error("Execution ID is required");
    
    console.log(`[Preview] Fetching preview data for execution ID: ${executionId}`);
    
    try {
      // Check if user is authenticated first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("[Preview] No active session found");
        throw new Error("Authentication required to view preview data");
      }
      
      // Try the standard preview endpoint first
      try {
        const data = await fetchDatasetPreview(executionId, {
          ...options,
          checkStatus: options.checkStatus || false
        });
        setDataSource('preview');
        console.log("[Preview] Preview data received:", data);
        return data;
      } catch (previewError) {
        console.error("[Preview] Error loading from preview API:", previewError);
        
        // Try direct database access as fallback
        try {
          console.log("[Preview] Trying direct database access as fallback");
          const directData = await fetchDirectExecutionData(executionId);
          
          if (directData) {
            console.log("[Preview] Successfully retrieved data directly from database");
            setDataSource('direct');
            
            // Create a properly structured PreviewData object
            // We need to check the shape of the data without assuming its structure
            const transformedData: PreviewData = {
              status: 'completed', // Default status
              execution: {
                id: executionId,
                startTime: new Date().toISOString()
              },
              preview: [],
              columns: [],
              totalCount: 0
            };
            
            // Only if directData is an object, try to extract properties safely
            if (directData && typeof directData === 'object' && directData !== null) {
              // Extract status if available
              if ('status' in directData && typeof directData.status === 'string') {
                transformedData.status = directData.status;
              }
              
              // Extract execution info if available
              if ('execution' in directData && typeof directData.execution === 'object' && directData.execution !== null) {
                const execution = directData.execution as Record<string, any>;
                transformedData.execution = {
                  id: typeof execution.id === 'string' ? execution.id : executionId,
                  startTime: typeof execution.startTime === 'string' ? execution.startTime : new Date().toISOString(),
                  endTime: typeof execution.endTime === 'string' ? execution.endTime : undefined,
                  rowCount: typeof execution.rowCount === 'number' ? execution.rowCount : undefined,
                  executionTimeMs: typeof execution.executionTimeMs === 'number' ? execution.executionTimeMs : undefined,
                  apiCallCount: typeof execution.apiCallCount === 'number' ? execution.apiCallCount : undefined
                };
              }
              
              // Extract dataset info if available
              if ('dataset' in directData && typeof directData.dataset === 'object' && directData.dataset !== null) {
                const dataset = directData.dataset as Record<string, any>;
                transformedData.dataset = {
                  id: typeof dataset.id === 'string' ? dataset.id : '',
                  name: typeof dataset.name === 'string' ? dataset.name : '',
                  type: typeof dataset.type === 'string' ? dataset.type : ''
                };
                
                // Extract template if available
                if (typeof dataset.template === 'object' && dataset.template !== null) {
                  transformedData.dataset.template = {
                    name: typeof (dataset.template as Record<string, any>).name === 'string' 
                      ? (dataset.template as Record<string, any>).name 
                      : ''
                  };
                }
              }
              
              // Extract preview data 
              if ('preview' in directData) {
                if (Array.isArray(directData.preview)) {
                  transformedData.preview = directData.preview;
                }
              } else if (Array.isArray(directData)) {
                // If directData itself is an array, use it as preview
                transformedData.preview = directData;
              }
              
              // Extract columns with correct typing
              if ('columns' in directData && Array.isArray(directData.columns)) {
                transformedData.columns = directData.columns.map(col => {
                  if (typeof col === 'object' && col !== null && 
                      'key' in col && typeof col.key === 'string' &&
                      'label' in col && typeof col.label === 'string') {
                    return { key: col.key, label: col.label };
                  }
                  // For any non-conforming column, create a standard format
                  const key = typeof col === 'string' ? col : JSON.stringify(col);
                  return { key, label: key };
                });
              }
              
              // Extract totalCount
              if ('totalCount' in directData && typeof directData.totalCount === 'number') {
                transformedData.totalCount = directData.totalCount;
              } else if (Array.isArray(transformedData.preview)) {
                transformedData.totalCount = transformedData.preview.length;
              }
              
              // Extract error message if available
              if ('error' in directData && typeof directData.error === 'string') {
                transformedData.error = directData.error;
              }
            }
            
            console.log("[Preview] Transformed direct data:", transformedData);
            return transformedData;
          }
        } catch (directError) {
          console.error("[Preview] Fallback direct data fetch also failed:", directError);
          
          // As a last resort, try querying the database directly for just the execution status
          try {
            // Check if user is authenticated first
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error("Authentication required to view preview data");
            }
            
            const { data: execution, error } = await supabase
              .from("dataset_executions")
              .select("id, status, start_time, end_time, row_count, error_message")
              .eq("id", executionId)
              .single();
            
            if (!error && execution) {
              console.log("[Preview] Retrieved minimal execution data");
              setDataSource('minimal');
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
                columns: [],
                error: execution.error_message
              };
            }
          } catch (minimalErr) {
            console.error("[Preview] Even minimal data fetch failed:", minimalErr);
          }
        }
        
        // If all fallbacks fail, rethrow the original error
        throw previewError;
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
