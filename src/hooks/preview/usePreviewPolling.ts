
import { useState, useRef, useCallback, useEffect } from "react";

interface PollingOptions {
  maxPollCount?: number;
  pollInterval?: number;
  maxConsecutiveErrors?: number;
}

export function usePreviewPolling(options: PollingOptions = {}) {
  const {
    maxPollCount = 60,
    pollInterval = 2000,
    maxConsecutiveErrors = 3
  } = options;
  
  const [pollCount, setPollCount] = useState(0);
  const [startTime] = useState<Date>(new Date());
  
  const mountedRef = useRef(true);
  const pollingRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const isPollingRef = useRef(false);
  
  // Function to check if component is still mounted
  const isMounted = useCallback(() => mountedRef.current, []);
  
  // Function to reset polling state
  const resetPolling = useCallback(() => {
    console.log("[Preview] Resetting polling");
    setPollCount(0);
    consecutiveErrorsRef.current = 0;
    
    // Clear any existing polling interval
    if (pollingRef.current !== null) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    
    isPollingRef.current = false;
  }, []);
  
  // Explicitly stop polling
  const stopPolling = useCallback(() => {
    console.log("[Preview] Explicitly stopping polling");
    if (pollingRef.current !== null) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingRef.current = false;
  }, []);
  
  // Function to start polling
  const startPolling = useCallback((pollingFn: () => Promise<void>) => {
    resetPolling();
    isPollingRef.current = true;
    
    const poll = async () => {
      if (!mountedRef.current || !isPollingRef.current) return;
      
      try {
        await pollingFn();
        
        // If still mounted and polling hasn't been manually stopped
        if (mountedRef.current && isPollingRef.current) {
          setPollCount(prev => prev + 1);
          
          // Check if we've reached the max poll count
          if (pollCount >= maxPollCount) {
            console.log(`[Preview] Reached max poll count (${maxPollCount}), stopping`);
            isPollingRef.current = false;
            return;
          }
          
          // Schedule next poll
          pollingRef.current = window.setTimeout(poll, pollInterval);
        }
      } catch (err) {
        console.error("[Preview] Error during polling:", err);
        
        // If component is still mounted, schedule next poll
        if (mountedRef.current && isPollingRef.current) {
          pollingRef.current = window.setTimeout(poll, pollInterval);
        }
      }
    };
    
    // Start the initial poll
    poll();
    
    // Return a cleanup function
    return () => {
      if (pollingRef.current !== null) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [maxPollCount, pollCount, pollInterval, resetPolling]);
  
  // Function to handle polling errors
  const handlePollingError = useCallback(() => {
    consecutiveErrorsRef.current += 1;
    
    // If we've reached the max consecutive errors, stop polling
    if (consecutiveErrorsRef.current >= maxConsecutiveErrors) {
      console.log(`[Preview] Reached max consecutive errors (${maxConsecutiveErrors}), stopping polling`);
      isPollingRef.current = false;
      return true; // Polling stopped
    }
    
    return false; // Polling continues
  }, [maxConsecutiveErrors]);
  
  // Function to handle polling success
  const handlePollingSuccess = useCallback(() => {
    consecutiveErrorsRef.current = 0;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (pollingRef.current !== null) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      
      isPollingRef.current = false;
    };
  }, []);
  
  return {
    pollCount,
    maxPollCount,
    startTime,
    startPolling,
    resetPolling,
    stopPolling,
    handlePollingError,
    handlePollingSuccess,
    isMounted,
    isPolling: isPollingRef.current
  };
}
