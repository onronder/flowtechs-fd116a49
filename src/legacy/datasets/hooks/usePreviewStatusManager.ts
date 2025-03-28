import { useCallback, useEffect, useRef } from "react";
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
  const effectInstanceRef = useRef<number>(0);
  
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
    // Create a unique instance ID for this effect run to prevent race conditions
    const currentEffectInstance = ++effectInstanceRef.current;
    
    // Create a local flag for this effect instance
    let effectActive = true;
    let cleanup: (() => void) | undefined;
    
    // Only proceed if modal is open and we have an execution ID
    if (isOpen && executionId) {
      resetPolling();
      
      console.log(`[Preview] Starting preview polling for execution ID: ${executionId}, effect instance: ${currentEffectInstance}`);
      
      // Only load initial data if this is still the active effect
      const loadInitialData = async () => {
        try {
          // Check if we already have data or if the data status is completed/failed
          if (previewData && ['completed', 'failed'].includes(previewData.status)) {
            console.log(`[Preview] Already have ${previewData.status} data, not starting polling`);
            return;
          }
          
          // Load initial data to see status
          const data = await loadPreview(
            executionId, 
            true, 
            false,
            handlePollingSuccess,
            handlePollingError
          );
          
          // Only start polling if this effect is still active
          if (!effectActive || currentEffectInstance !== effectInstanceRef.current) {
            console.log(`[Preview] Effect no longer active, not starting polling`);
            return;
          }
          
          // Only start polling for in-progress executions
          if (data && (data.status === "running" || data.status === "pending")) {
            // Start polling only for in-progress executions
            const pollingFunction = () => {
              // Do not poll if this effect is no longer active
              if (!effectActive || currentEffectInstance !== effectInstanceRef.current) {
                console.log(`[Preview] Effect no longer active during polling`);
                return Promise.resolve();
              }
              
              return loadPreview(
                executionId, 
                false, 
                false,
                handlePollingSuccess,
                handlePollingError
              ).then(() => {
                // Return void to satisfy the Promise<void> requirement
                return;
              });
            };
            
            cleanup = startPolling(pollingFunction);
          } else if (data && (data.status === "completed" || data.status === "failed" || data.status === "stuck")) {
            // Explicitly stop polling for completed or failed executions
            console.log(`[Preview] Execution ${executionId} status is ${data.status}, not polling`);
            stopPolling();
          }
        } catch (error) {
          console.error("[Preview] Error in initial load:", error);
        }
      };
      
      loadInitialData();
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
      
      console.log(`[Preview] Cleaning up effect instance ${currentEffectInstance}`);
    };
  }, [
    isOpen, 
    executionId, 
    loadPreview, 
    resetPolling, 
    startPolling, 
    stopPolling, 
    handlePollingSuccess,
    handlePollingError,
    previewData
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
