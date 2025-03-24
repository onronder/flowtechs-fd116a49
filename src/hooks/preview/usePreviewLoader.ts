
import { useCallback } from "react";
import { PreviewData } from "./previewTypes";
import { usePreviewDataLoader } from "./usePreviewDataLoader";
import { usePreviewPolling } from "./usePreviewPolling";

interface PreviewLoaderProps {
  setPreviewData: (data: PreviewData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isMounted: () => boolean;
}

export function usePreviewLoader({ 
  setPreviewData, 
  setLoading, 
  setError, 
  isMounted 
}: PreviewLoaderProps) {
  const { dataSource, loadPreviewData } = usePreviewDataLoader();
  
  const loadPreview = useCallback(async (
    executionId: string | null, 
    showLoading = true, 
    checkStatus = false,
    handlePollingSuccess: () => void,
    handlePollingError: () => boolean
  ) => {
    try {
      if (!isMounted() || !executionId) return;
      
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      console.log(`[Preview] Loading preview data for execution ID: ${executionId}, checkStatus: ${checkStatus}`);
      
      const data = await loadPreviewData(executionId, {
        limit: 5, // Limit to 5 records
        maxRetries: 2,
        retryDelay: 1000,
        checkStatus
      });
      
      if (!isMounted()) return;
      
      console.log(`[Preview] Preview data loaded with status: ${data.status}`);
      
      // Handle successful data load
      handlePollingSuccess();
      setPreviewData(data);
      setLoading(false); // Always ensure loading is set to false when data is received
      
      return data;
    } catch (err) {
      if (!isMounted()) return;
      
      const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
      console.error(`[Preview] Error loading preview:`, errorMessage);
      
      setError(errorMessage);
      setLoading(false); // Ensure loading is set to false even on error
      
      // Check if it's an authentication error
      if (errorMessage.includes("Authentication required")) {
        handlePollingError();
        return null;
      } else {
        // Handle polling error (stops polling if too many consecutive errors)
        handlePollingError();
      }
      
      return null;
    }
  }, [isMounted, loadPreviewData, setError, setLoading, setPreviewData]);
  
  return {
    loadPreview,
    dataSource
  };
}
