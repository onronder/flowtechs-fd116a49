
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useDatasetPreview(executionId: string | null, isOpen: boolean) {
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'preview' | 'direct'>('preview');
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_POLL_COUNT = 120; // 4 minutes at 2-second intervals
  const POLL_INTERVAL = 2000; // 2 seconds between polls
  const pollCountRef = useRef(0);
  const mountedRef = useRef(true);
  const startTimeRef = useRef<string | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const MAX_CONSECUTIVE_ERRORS = 3;

  // Cleanup function
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Function to reset polling
  const resetPolling = useCallback(() => {
    pollCountRef.current = 0;
    consecutiveErrorsRef.current = 0;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);
  
  // Direct database fallback for when preview fails
  const fetchDirectExecutionData = useCallback(async (execId: string) => {
    if (!execId) return null;
    
    try {
      console.log(`[Preview] Attempting direct data fetch for execution ID: ${execId}`);
      setDataSource('direct');
      
      // First get the execution details
      const { data: execution, error: executionError } = await supabase
        .from("dataset_executions")
        .select("*")
        .eq("id", execId)
        .single();
      
      if (executionError || !execution) {
        console.error("[Preview] Direct fetch - execution error:", executionError);
        throw new Error(executionError?.message || "Execution not found");
      }
      
      // Get dataset details
      const { data: dataset, error: datasetError } = await supabase
        .from("user_datasets")
        .select("*")
        .eq("id", execution.dataset_id)
        .single();
      
      if (datasetError || !dataset) {
        console.error("[Preview] Direct fetch - dataset error:", datasetError);
        throw new Error(datasetError?.message || "Dataset not found");
      }
      
      // Try using the SQL_Utils function to get data directly
      try {
        const { data: directData, error: directError } = await supabase.functions.invoke(
          "SQL_Utils",
          {
            body: {
              operation: "get_execution_data",
              parameters: { executionId: execId }
            }
          }
        );
        
        if (directError) {
          console.error("[Preview] SQL_Utils error:", directError);
          throw new Error(directError.message || "Failed to get execution data");
        }
        
        if (directData && directData.data) {
          console.log("[Preview] Successfully retrieved data from SQL_Utils:", directData);
          
          // Process the raw data
          let rawData = directData.data;
          let preview = [];
          let totalCount = 0;
          
          // Data can sometimes be stored as JSON string, so handle that case
          if (typeof rawData === 'string') {
            try {
              rawData = JSON.parse(rawData);
            } catch (e) {
              console.log("[Preview] Data was string but not valid JSON");
            }
          }
          
          if (Array.isArray(rawData)) {
            preview = rawData.slice(0, 100);
            totalCount = rawData.length;
          } else if (rawData && typeof rawData === 'object') {
            if (rawData.results && Array.isArray(rawData.results)) {
              preview = rawData.results.slice(0, 100);
              totalCount = rawData.results.length;
            } else {
              preview = [rawData];
              totalCount = 1;
            }
          }
          
          // Get columns from first item
          const columns = preview.length > 0
            ? Object.keys(preview[0]).map(key => ({ key, label: key }))
            : [];
          
          return {
            status: execution.status,
            execution: {
              id: execution.id,
              startTime: execution.start_time,
              endTime: execution.end_time,
              rowCount: execution.row_count || totalCount,
              executionTimeMs: execution.execution_time_ms,
              apiCallCount: execution.api_call_count
            },
            dataset: {
              id: dataset.id,
              name: dataset.name,
              type: dataset.dataset_type
            },
            columns,
            preview,
            totalCount
          };
        }
      } catch (sqlUtilsError) {
        console.error("[Preview] SQL_Utils fetch failed:", sqlUtilsError);
        // Fall through to default processing
      }
      
      // Process the data
      let preview = [];
      let totalCount = 0;
      
      // Data can sometimes be stored as JSON string, so handle that case
      let processedData = execution.data;
      if (typeof processedData === 'string') {
        try {
          processedData = JSON.parse(processedData);
        } catch (e) {
          console.log("[Preview] Data was string but not valid JSON");
        }
      }
      
      if (Array.isArray(processedData)) {
        preview = processedData.slice(0, 100);
        totalCount = processedData.length;
      } else if (processedData && typeof processedData === 'object') {
        preview = [processedData];
        totalCount = 1;
      } else {
        preview = [];
        totalCount = 0;
      }
      
      // Get columns from first item
      const columns = preview.length > 0
        ? Object.keys(preview[0]).map(key => ({ key, label: key }))
        : [];
      
      // Build response similar to the API
      return {
        status: execution.status,
        execution: {
          id: execution.id,
          startTime: execution.start_time,
          endTime: execution.end_time,
          rowCount: execution.row_count || totalCount,
          executionTimeMs: execution.execution_time_ms,
          apiCallCount: execution.api_call_count
        },
        dataset: {
          id: dataset.id,
          name: dataset.name,
          type: dataset.dataset_type
        },
        columns,
        preview,
        totalCount
      };
    } catch (err) {
      console.error("[Preview] Error in direct data fetch:", err);
      throw err;
    }
  }, []);

  const loadPreview = useCallback(async (showLoading = true) => {
    try {
      if (!mountedRef.current || !executionId) return;
      
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      console.log(`[Preview] Fetching preview data for execution ID: ${executionId}, poll #${pollCountRef.current}`);
      
      try {
        // Try the standard preview endpoint first
        const data = await fetchDatasetPreview(executionId, {
          limit: 100,
          maxRetries: 2,
          retryDelay: 1000
        });
        
        if (!mountedRef.current) return;
        
        // Reset consecutive errors counter on success
        consecutiveErrorsRef.current = 0;
        setDataSource('preview');
        
        console.log("[Preview] Preview data received:", data);
        setPreviewData(data);
        
        // If this is the first successful response and status is running or pending
        // store the current time as the start time for elapsed time tracking
        if (!startTimeRef.current && (data.status === "running" || data.status === "pending")) {
          startTimeRef.current = new Date().toISOString();
        }
        
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
        if (!mountedRef.current) return;
        
        console.error("[Preview] Error loading from preview API:", err);
        
        // Try direct database access as fallback
        try {
          const directData = await fetchDirectExecutionData(executionId);
          
          if (!mountedRef.current) return;
          
          if (directData) {
            console.log("[Preview] Successfully retrieved data directly from database:", directData);
            setPreviewData(directData);
            setDataSource('direct');
            
            // Reset error counters
            consecutiveErrorsRef.current = 0;
            
            // Stop polling if the execution is complete or failed
            if (directData.status === "completed" || directData.status === "failed") {
              resetPolling();
            }
            
            // Don't throw the original error since we recovered
            return;
          }
        } catch (fallbackErr) {
          console.error("[Preview] Fallback direct data fetch also failed:", fallbackErr);
          // Continue to error handling with the original error
        }
        
        // If we get here, both methods failed
        consecutiveErrorsRef.current++;
        
        const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
        setError(errorMessage);
        
        // If we've hit too many consecutive errors, stop polling
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          console.log(`[Preview] ${MAX_CONSECUTIVE_ERRORS} consecutive errors, stopping polling`);
          resetPolling();
          
          toast({
            title: "Error",
            description: "Failed to load dataset preview after multiple attempts",
            variant: "destructive"
          });
        }
      }
    } finally {
      if (showLoading && mountedRef.current) setLoading(false);
    }
  }, [executionId, toast, resetPolling, fetchDirectExecutionData]);

  useEffect(() => {
    if (isOpen && executionId) {
      // Reset state when opening with a new execution ID
      setLoading(true);
      setError(null);
      setPreviewData(null);
      resetPolling();
      startTimeRef.current = null;
      
      console.log(`[Preview] Starting preview polling for execution ID: ${executionId}`);
      
      // Initial load
      loadPreview();
      
      // Set up polling
      pollingIntervalRef.current = setInterval(() => {
        if (pollCountRef.current >= MAX_POLL_COUNT) {
          console.log("[Preview] Max polling attempts reached, stopping polling");
          resetPolling();
          
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
        resetPolling();
      };
    }
  }, [isOpen, executionId, loadPreview, previewData, resetPolling, toast]);

  return {
    previewData,
    loading,
    error,
    loadPreview,
    dataSource,
    pollCount: pollCountRef.current,
    maxPollCount: MAX_POLL_COUNT,
    startTime: startTimeRef.current
  };
}
