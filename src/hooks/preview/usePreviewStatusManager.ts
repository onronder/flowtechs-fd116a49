
import { useCallback, useEffect } from "react";
import { PreviewData } from "./previewTypes";
import { usePreviewPolling } from "./usePreviewPolling";

interface PreviewStatusManagerProps {
  isOpen: boolean;
  executionId: string | null;
  previewData: PreviewData | null;
  loadPreview: (
    executionId: string | null, 
    showLoading: boolean, 
    checkStatus: boolean,
    handlePollingSuccess: () => void,
    handlePollingError: () => boolean
  ) => Promise<PreviewData | null | undefined>;
}

export function usePreviewStatusManager({
  isOpen,
  executionId,
  previewData,
  loadPreview
}: PreviewStatusManagerProps) {
  const {
    pollCount,
    maxPollCount,
    startTime,
    startPolling,
    resetPolling,
    stopPolling,
    handlePollingError,
    handlePollingSuccess,
    isMounted,
    isPolling
  } = usePreviewPolling({
    maxPollCount: 120, // 4 minutes at 2-second intervals
    pollInterval: 2000,
    maxConsecutiveErrors: 3
  });
  
  // Handle checking for stuck executions
  const checkForStuckExecution = useCallback(() => {
    if (!executionId) return Promise.resolve(null);
    return loadPreview(
      executionId, 
      true, 
      true,
      handlePollingSuccess,
      handlePollingError
    );
  }, [executionId, loadPreview, handlePollingSuccess, handlePollingError]);
  
  // Main effect for loading data and managing polling
  useEffect(() => {
    // Create a local flag for this effect instance
    let effectActive = true;
    let cleanup: (() => void) | undefined;
    
    if (isOpen && executionId) {
      resetPolling();
      
      console.log(`[Preview] Starting preview polling for execution ID: ${executionId}`);
      
      // Load initial data to see status
      loadPreview(
        executionId, 
        true, 
        false,
        handlePollingSuccess,
        handlePollingError
      ).then((data) => {
        // Only start polling if the execution is still in progress and this effect is still active
        if (effectActive && data && (data.status === "running" || data.status === "pending")) {
          // Start polling only for in-progress executions
          const pollingFunction = () => {
            return loadPreview(
              executionId, 
              false, 
              false,
              handlePollingSuccess,
              handlePollingError
            );
          };
          
          cleanup = startPolling(pollingFunction);
        } else if (data && (data.status === "completed" || data.status === "failed" || data.status === "stuck")) {
          // Explicitly stop polling for completed or failed executions
          stopPolling();
        }
      }).catch(error => {
        console.error("[Preview] Error in initial load:", error);
      });
    }
    
    return () => {
      effectActive = false;
      
      if (cleanup) {
        cleanup();
      }
      
      stopPolling();
      
      // Only reset polling if the modal is closed
      if (!isOpen) {
        resetPolling();
      }
    };
  }, [
    isOpen, 
    executionId, 
    loadPreview, 
    resetPolling, 
    startPolling, 
    stopPolling, 
    handlePollingSuccess,
    handlePollingError
  ]);

  return {
    pollCount,
    maxPollCount,
    startTime,
    isPolling,
    isMounted,
    checkForStuckExecution
  };
}
