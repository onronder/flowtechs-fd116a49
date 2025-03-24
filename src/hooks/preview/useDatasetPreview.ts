
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePreviewPolling } from "./usePreviewPolling";
import { usePreviewDataLoader } from "./usePreviewDataLoader";
import { useStuckExecutionDetector } from "./useStuckExecutionDetector";
import { PreviewData } from "./previewTypes";

export function useDatasetPreview(executionId: string | null, isOpen: boolean) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { 
    dataSource, 
    loadPreviewData 
  } = usePreviewDataLoader();
  
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

  const { shouldShowStuckUi } = useStuckExecutionDetector({
    isOpen,
    executionId,
    previewData,
    startTime,
    pollCount
  });

  // Check authentication status
  useEffect(() => {
    if (isOpen) {
      // Pre-check authentication status
      supabase.auth.getSession().then(({ data: { session }}) => {
        if (!session) {
          setError("Authentication required to view preview data");
          setLoading(false);
        }
      });
    }
  }, [isOpen]);

  const loadPreview = useCallback(async (showLoading = true, checkStatus = false) => {
    try {
      if (!isMounted() || !executionId) return;
      
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      const data = await loadPreviewData(executionId, {
        limit: 5, // Limit to 5 records
        maxRetries: 2,
        retryDelay: 1000,
        checkStatus
      });
      
      if (!isMounted()) return;
      
      // Handle successful data load
      handlePollingSuccess();
      setPreviewData(data);
      setLoading(false); // Always ensure loading is set to false when data is received
      
      // If execution is complete, failed, or stuck, explicitly stop polling
      if (data.status === "completed" || data.status === "failed" || data.status === "stuck") {
        console.log(`[Preview] Execution ${data.status}, stopping polling`);
        stopPolling(); // Make sure to stop the polling
        resetPolling();
        
        if (data.status === "completed") {
          toast({
            title: "Execution Complete",
            description: `Retrieved ${data.totalCount || 0} rows of data.`,
          });
        } else if (data.status === "failed") {
          toast({
            title: "Execution Failed",
            description: data.error || "The dataset execution failed",
            variant: "destructive"
          });
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      
      const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
      setError(errorMessage);
      setLoading(false); // Ensure loading is set to false even on error
      
      // Check if it's an authentication error
      if (errorMessage.includes("Authentication required")) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to view dataset preview",
          variant: "destructive"
        });
        stopPolling(); // Explicitly stop polling
        resetPolling(); // Stop polling on auth errors
      } else {
        // Handle polling error (stops polling if too many consecutive errors)
        const pollingStopped = handlePollingError();
        
        if (pollingStopped && previewData && 
           (previewData.status === "running" || previewData.status === "pending")) {
          setError("Execution is taking longer than expected. Please check back later.");
        }
      }
    }
  }, [executionId, toast, resetPolling, stopPolling, loadPreviewData, 
       handlePollingError, handlePollingSuccess, isMounted, previewData]);

  // Explicitly check for stuck executions on demand
  const checkForStuckExecution = useCallback(() => {
    return loadPreview(true, true);
  }, [loadPreview]);

  useEffect(() => {
    if (isOpen && executionId) {
      // Reset state when opening with a new execution ID
      setLoading(true);
      setError(null);
      setPreviewData(null);
      resetPolling();
      
      console.log(`[Preview] Starting preview polling for execution ID: ${executionId}`);
      
      // Start polling
      const cleanup = startPolling(() => loadPreview(false));
      
      return () => {
        cleanup();
        stopPolling(); // Ensure polling is stopped on unmount
      };
    }
    
    // Additional cleanup when modal is closed
    return () => {
      if (!isOpen) {
        stopPolling();
        resetPolling();
      }
    };
  }, [isOpen, executionId, loadPreview, resetPolling, startPolling, stopPolling]);

  return {
    previewData,
    loading,
    error,
    loadPreview,
    dataSource,
    pollCount,
    maxPollCount,
    startTime,
    shouldShowStuckUi,
    checkForStuckExecution,
    isPolling
  };
}
