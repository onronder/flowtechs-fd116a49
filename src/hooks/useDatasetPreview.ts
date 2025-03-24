
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePreviewPolling } from "./usePreviewPolling";
import { usePreviewDataLoader, DataSourceType } from "./usePreviewDataLoader";
import { supabase } from "@/integrations/supabase/client";

export interface PreviewData {
  status: string;
  execution?: {
    id: string;
    startTime: string;
    endTime?: string;
    rowCount?: number;
    executionTimeMs?: number;
    apiCallCount?: number;
  };
  dataset?: {
    id: string;
    name: string;
    type: string;
    template?: {
      name: string;
    };
  };
  columns?: Array<{ key: string; label: string }>;
  preview?: any[];
  totalCount?: number;
  error?: string;
}

export function useDatasetPreview(executionId: string | null, isOpen: boolean) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowStuckUi, setShouldShowStuckUi] = useState(false);
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
    handlePollingError,
    handlePollingSuccess,
    isMounted
  } = usePreviewPolling({
    maxPollCount: 120, // 4 minutes at 2-second intervals
    pollInterval: 2000,
    maxConsecutiveErrors: 3
  });

  // Check for potentially stuck executions
  useEffect(() => {
    if (!isOpen || !executionId || !startTime || !previewData) return;

    // If execution has been in pending/running state for too long
    if (['pending', 'running'].includes(previewData.status)) {
      const executionStartTime = previewData.execution?.startTime ? 
        new Date(previewData.execution.startTime) : 
        new Date(startTime);
        
      const now = new Date();
      const diffMinutes = (now.getTime() - executionStartTime.getTime()) / (1000 * 60);
      
      // Show the stuck UI if execution has been running for more than 3 minutes
      if (diffMinutes > 3) {
        setShouldShowStuckUi(true);
      }
    } else {
      setShouldShowStuckUi(false);
    }
  }, [isOpen, executionId, previewData, startTime, pollCount]);

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
        limit: 100,
        maxRetries: 2,
        retryDelay: 1000,
        checkStatus
      });
      
      if (!isMounted()) return;
      
      // Handle successful data load
      handlePollingSuccess();
      setPreviewData(data);
      
      // If execution is complete, failed, or stuck, stop polling
      if (data.status === "completed" || data.status === "failed" || data.status === "stuck") {
        console.log(`[Preview] Execution ${data.status}, stopping polling`);
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
        } else if (data.status === "stuck") {
          // Don't show a toast, the UI will handle this
          setShouldShowStuckUi(true);
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      
      const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
      setError(errorMessage);
      
      // Check if it's an authentication error
      if (errorMessage.includes("Authentication required")) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to view dataset preview",
          variant: "destructive"
        });
        resetPolling(); // Stop polling on auth errors
      } else {
        // Handle polling error (stops polling if too many consecutive errors)
        const pollingStopped = handlePollingError();
        
        if (pollingStopped && previewData && 
           (previewData.status === "running" || previewData.status === "pending")) {
          setError("Execution is taking longer than expected. Please check back later.");
        }
      }
    } finally {
      if (showLoading && isMounted()) setLoading(false);
    }
  }, [executionId, toast, resetPolling, loadPreviewData, 
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
      setShouldShowStuckUi(false);
      resetPolling();
      
      console.log(`[Preview] Starting preview polling for execution ID: ${executionId}`);
      
      // Start polling
      const cleanup = startPolling(() => loadPreview(false));
      
      return cleanup;
    }
  }, [isOpen, executionId, loadPreview, resetPolling, startPolling]);

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
    checkForStuckExecution
  };
}
