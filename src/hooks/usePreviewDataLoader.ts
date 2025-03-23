
import { useState, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { fetchDirectExecutionData } from "@/api/datasets/execution/directDatabaseAccess";

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
      
      // If execution is complete or failed, return the data
      return data;
    } catch (err) {
      console.error("[Preview] Error loading from preview API:", err);
      
      // Try direct database access as fallback
      try {
        const directData = await fetchDirectExecutionData(executionId);
        
        if (directData) {
          console.log("[Preview] Successfully retrieved data directly from database:", directData);
          setDataSource('direct');
          return directData;
        }
      } catch (fallbackErr) {
        console.error("[Preview] Fallback direct data fetch also failed:", fallbackErr);
      }
      
      // Both methods failed, rethrow the original error
      throw err;
    }
  }, []);
  
  return {
    loadPreviewData,
    dataSource
  };
}
