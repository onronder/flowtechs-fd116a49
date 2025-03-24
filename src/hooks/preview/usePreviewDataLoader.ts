
import { useState, useCallback } from "react";
import { DataSourceType, PreviewOptions, PreviewData } from "./previewTypes";
import { validateAuthentication, validateExecutionId } from "./utils/previewValidation";
import { 
  fetchFromPreviewApi, 
  fetchFromDirectDatabase, 
  fetchMinimalExecutionData 
} from "./utils/dataRetrievalStrategies";

export function usePreviewDataLoader() {
  const [dataSource, setDataSource] = useState<DataSourceType>('preview');
  
  const loadPreviewData = useCallback(async (
    executionId: string, 
    options: PreviewOptions = {}
  ): Promise<PreviewData> => {
    try {
      // Validate inputs
      validateExecutionId(executionId);
      console.log(`[Preview] Fetching preview data for execution ID: ${executionId}, options:`, options);
      
      // Check authentication
      await validateAuthentication();
      
      // Try each data retrieval strategy in sequence
      try {
        // Try the standard preview endpoint first
        const { source, data } = await fetchFromPreviewApi(executionId, options);
        setDataSource(source);
        return data;
      } catch (previewError) {
        console.error("[Preview] Error loading from preview API:", previewError);
        
        // Try direct database access as fallback
        try {
          const { source, data } = await fetchFromDirectDatabase(executionId);
          setDataSource(source);
          return data;
        } catch (directError) {
          console.error("[Preview] Fallback direct data fetch also failed:", directError);
          
          // As a last resort, try querying the database directly for just the execution status
          try {
            const { source, data } = await fetchMinimalExecutionData(executionId);
            setDataSource(source);
            return data;
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
