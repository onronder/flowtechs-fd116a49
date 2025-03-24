import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePreviewPolling } from "./usePreviewPolling";
import { usePreviewDataLoader } from "./usePreviewDataLoader";

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
  } = usePreviewPolling();

  const loadPreview = useCallback(async (showLoading = true) => {
    try {
      if (!isMounted() || !executionId) return;
      
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      const data = await loadPreviewData(executionId, {
        limit: 100,
        maxRetries: 2,
        retryDelay: 1000
      });
      
      if (!isMounted()) return;
      
      // Handle successful data load
      handlePollingSuccess();
      setPreviewData(data);
      
      // If execution is complete or failed, stop polling
      if (data.status === "completed" || data.status === "failed") {
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
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      
      const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
      setError(errorMessage);
      
      // Handle polling error (stops polling if too many consecutive errors)
      const pollingStopped = handlePollingError();
      
      if (pollingStopped && previewData && 
         (previewData.status === "running" || previewData.status === "pending")) {
        setError("Execution is taking longer than expected. Please check back later.");
      }
    } finally {
      if (showLoading && isMounted()) setLoading(false);
    }
  }, [executionId, toast, resetPolling, loadPreviewData, 
       handlePollingError, handlePollingSuccess, isMounted, previewData]);

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
    startTime
  };
}
