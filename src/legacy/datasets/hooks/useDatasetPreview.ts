import { useState } from "react";
import { useStuckExecutionDetector } from "./useStuckExecutionDetector";
import { usePreviewExecutionState } from "./usePreviewExecutionState";
import { usePreviewLoader } from "./usePreviewLoader";
import { usePreviewModalIntegration } from "./usePreviewModalIntegration";
import { usePreviewStatusManager } from "./usePreviewStatusManager";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useDatasetPreview(executionId: string | null, isOpen: boolean) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Hook for managing execution state
  const {
    previewData,
    setPreviewData,
    loading,
    setLoading,
    error,
    setError,
    resetExecutionState
  } = usePreviewExecutionState();
  
  // Hook for modal integration
  const { currentExecutionId } = usePreviewModalIntegration(isOpen, executionId);
  
  // Status manager with polling capabilities
  const {
    pollCount,
    maxPollCount,
    startTime,
    isPolling,
    isMounted,
    checkForStuckExecution
  } = usePreviewStatusManager({
    isOpen,
    executionId: currentExecutionId,
    previewData,
    loadPreview: async (executionId, showLoading, checkStatus, handlePollingSuccess, handlePollingError) => {
      return loadPreviewFn(
        executionId!, 
        showLoading, 
        checkStatus, 
        handlePollingSuccess, 
        handlePollingError
      );
    }
  });
  
  // Hook for preview loading
  const { loadPreview, dataSource } = usePreviewLoader({
    setPreviewData,
    setLoading,
    setError,
    isMounted
  });
  
  // Create a wrapper function to pass all necessary parameters
  const loadPreviewFn = async (
    executionId: string, 
    showLoading = true, 
    checkStatus = false,
    handlePollingSuccess: () => void,
    handlePollingError: () => boolean
  ) => {
    return loadPreview(
      executionId, 
      showLoading, 
      checkStatus,
      handlePollingSuccess,
      handlePollingError
    );
  };
  
  // Hook for stuck execution detection
  const { shouldShowStuckUi } = useStuckExecutionDetector({
    isOpen,
    executionId: currentExecutionId,
    previewData,
    startTime,
    pollCount
  });
  
  // Check authentication status
  useEffect(() => {
    let isMountedLocal = true;
    
    if (isOpen) {
      // Pre-check authentication status
      supabase.auth.getSession().then(({ data: { session }}) => {
        if (!session && isMountedLocal) {
          setError("Authentication required to view preview data");
          setLoading(false);
        }
      });
    }
    
    return () => { isMountedLocal = false; };
  }, [isOpen, setError, setLoading]);
  
  // Reset state when opening the modal
  useEffect(() => {
    if (isOpen && currentExecutionId) {
      resetExecutionState();
    }
  }, [isOpen, currentExecutionId, resetExecutionState]);
  
  return {
    previewData,
    loading,
    error,
    loadPreview: (showLoading = true, checkStatus = false) => {
      if (!currentExecutionId) return Promise.resolve(null);
      // Create dummy functions since we're not using them in this context
      const dummySuccess = () => {};
      const dummyError = () => false;
      return loadPreviewFn(currentExecutionId, showLoading, checkStatus, dummySuccess, dummyError);
    },
    dataSource,
    pollCount,
    maxPollCount,
    startTime,
    shouldShowStuckUi,
    checkForStuckExecution,
    isPolling,
    isExporting,
    setIsExporting
  };
}
