
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { useToast } from "@/hooks/use-toast";

export function useDatasetPreview(executionId: string | null, isOpen: boolean) {
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_POLL_COUNT = 120; // Increased for longer operations - 4 minutes at 2-second intervals
  const POLL_INTERVAL = 2000; // 2 seconds between polls
  const pollCountRef = useRef(0);
  const mountedRef = useRef(true);
  const startTimeRef = useRef<string | null>(null);

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
      
      console.log(`[Preview] Fetching preview data for execution ID: ${executionId}, poll #${pollCountRef.current}`);
      const data = await fetchDatasetPreview(executionId);
      console.log("[Preview] Preview data received:", data);
      
      if (!mountedRef.current) return;
      setPreviewData(data);
      
      // If this is the first successful response and status is running or pending
      // store the current time as the start time for elapsed time tracking
      if (!startTimeRef.current && (data.status === "running" || data.status === "pending")) {
        startTimeRef.current = new Date().toISOString();
      }
      
      // If execution is complete or failed, stop polling
      if (data.status === "completed" || data.status === "failed") {
        console.log(`[Preview] Execution ${data.status}, stopping polling`);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
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
      if (!mountedRef.current) return;
      
      console.error("[Preview] Error loading preview:", err);
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
      startTimeRef.current = null;
      
      console.log(`[Preview] Starting preview polling for execution ID: ${executionId}`);
      
      // Initial load
      loadPreview();
      
      // Set up polling
      pollingIntervalRef.current = setInterval(() => {
        if (pollCountRef.current >= MAX_POLL_COUNT) {
          console.log("[Preview] Max polling attempts reached, stopping polling");
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Show a timeout error if we still don't have data
          if (!previewData || (previewData.status === "running" || previewData.status === "pending")) {
            setError("Execution is taking longer than expected. Please check back later.");
            toast({
              title: "Execution Timeout",
              description: "The dataset execution is taking longer than expected. Please try again later.",
              variant: "destructive"
            });
          }
          return;
        }
        
        pollCountRef.current++;
        console.log(`[Preview] Polling attempt ${pollCountRef.current}/${MAX_POLL_COUNT}`);
        loadPreview(false); // Don't show loading indicator for polling
      }, POLL_INTERVAL);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, executionId, loadPreview, previewData]);

  return {
    previewData,
    loading,
    error,
    loadPreview,
    pollCount: pollCountRef.current,
    maxPollCount: MAX_POLL_COUNT,
    startTime: startTimeRef.current
  };
}
