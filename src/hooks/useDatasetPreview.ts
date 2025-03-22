
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/index";
import { useToast } from "@/hooks/use-toast";

export function useDatasetPreview(executionId: string | null, isOpen: boolean) {
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_POLL_COUNT = 20;
  const pollCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Cleanup function
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadPreview = useCallback(async (showLoading = true) => {
    try {
      if (!mountedRef.current || !executionId) return;
      
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      console.log("Fetching preview data for execution ID:", executionId);
      const data = await fetchDatasetPreview(executionId);
      console.log("Preview data received:", data);
      
      if (!mountedRef.current) return;
      setPreviewData(data);
      
      // If execution is complete or failed, stop polling
      if (data.status === "completed" || data.status === "failed") {
        console.log("Execution complete, stopping polling");
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error("Error loading preview:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
      setError(errorMessage);
      
      // Stop polling on error
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      toast({
        title: "Error",
        description: "Failed to load dataset preview.",
        variant: "destructive"
      });
    } finally {
      if (showLoading && mountedRef.current) setLoading(false);
    }
  }, [executionId, toast]);

  useEffect(() => {
    if (isOpen && executionId) {
      // Reset state when opening with a new execution ID
      setLoading(true);
      setError(null);
      setPreviewData(null);
      pollCountRef.current = 0;
      
      // Initial load
      loadPreview();
      
      // Set up polling
      pollingIntervalRef.current = setInterval(() => {
        if (pollCountRef.current >= MAX_POLL_COUNT) {
          console.log("Max polling attempts reached, stopping polling");
          clearInterval(pollingIntervalRef.current);
          
          // Show a timeout error if we still don't have data
          if (!previewData || previewData.status === "running" || previewData.status === "pending") {
            setError("Execution is taking longer than expected. Please check back later.");
          }
          return;
        }
        
        pollCountRef.current++;
        console.log(`Polling attempt ${pollCountRef.current}/${MAX_POLL_COUNT}`);
        loadPreview(false); // Don't show loading indicator for polling
      }, 2000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, executionId, previewData, loadPreview]);

  return {
    previewData,
    loading,
    error,
    loadPreview,
    pollCount: pollCountRef.current,
    maxPollCount: MAX_POLL_COUNT
  };
}
