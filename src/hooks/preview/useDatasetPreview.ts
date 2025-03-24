
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
  }, [isOpen]);

  const loadPreview = useCallback(async (showLoading = true, checkStatus = false) => {
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
      console.error(`[Preview] Error loading preview:`, errorMessage);
      
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

  // Main effect for loading data and managing polling
  useEffect(() => {
    // Create a local flag for this effect instance
    let effectActive = true;
    let cleanup: (() => void) | undefined;
    
    if (isOpen && executionId) {
      // Reset state when opening with a new execution ID
      if (effectActive) {
        setLoading(true);
        setError(null);
      }
      
      // Don't reset preview data here to avoid flickering
      // Only clear it if it's for a different execution ID
      if (previewData && previewData.execution?.id !== executionId && effectActive) {
        setPreviewData(null);
      }
      
      resetPolling();
      
      console.log(`[Preview] Starting preview polling for execution ID: ${executionId}`);
      
      // Load initial data to see status
      loadPreview(true, false).then(() => {
        // Only start polling if the execution is still in progress and this effect is still active
        if (effectActive && previewData && (previewData.status === "running" || previewData.status === "pending")) {
          // Start polling only for in-progress executions
          cleanup = startPolling(() => loadPreview(false));
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
  }, [isOpen, executionId, loadPreview, resetPolling, startPolling, stopPolling, previewData]);

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
