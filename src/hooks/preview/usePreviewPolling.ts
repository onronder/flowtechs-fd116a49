
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
  const [startTime] = useState<string>(new Date().toISOString());
  
  const mountedRef = useRef(true);
  const pollingRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const isPollingRef = useRef(false);
  const pollingFunctionRef = useRef<(() => Promise<void>) | null>(null);
  
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
    pollingFunctionRef.current = null;
  }, []);
  
  // Explicitly stop polling
  const stopPolling = useCallback(() => {
    console.log("[Preview] Explicitly stopping polling");
    if (pollingRef.current !== null) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingRef.current = false;
    pollingFunctionRef.current = null;
  }, []);
  
  // Function to start polling
  const startPolling = useCallback((pollingFn: () => Promise<void>) => {
    // Don't start polling if it's already active
    if (isPollingRef.current) {
      console.log("[Preview] Polling already in progress, not starting again");
      return () => {};
    }
    
    resetPolling();
    isPollingRef.current = true;
    pollingFunctionRef.current = pollingFn;
    console.log("[Preview] Starting polling cycle");
    
    const poll = async () => {
      if (!mountedRef.current || !isPollingRef.current || !pollingFunctionRef.current) {
        console.log("[Preview] Polling stopped: component unmounted or polling disabled");
        return;
      }
      
      try {
        console.log(`[Preview] Executing poll #${pollCount + 1}`);
        await pollingFunctionRef.current();
        
        // If still mounted and polling hasn't been manually stopped
        if (mountedRef.current && isPollingRef.current) {
          setPollCount(prev => {
            const newCount = prev + 1;
            console.log(`[Preview] Poll count updated: ${prev} -> ${newCount}`);
            
            // Check if we've reached the max poll count
            if (newCount >= maxPollCount) {
              console.log(`[Preview] Reached max poll count (${maxPollCount}), stopping`);
              isPollingRef.current = false;
              return newCount;
            }
            
            // Schedule next poll
            if (isPollingRef.current && pollingFunctionRef.current) {
              console.log(`[Preview] Scheduling next poll in ${pollInterval}ms`);
              if (pollingRef.current !== null) {
                clearTimeout(pollingRef.current);
              }
              pollingRef.current = window.setTimeout(poll, pollInterval);
            }
            
            return newCount;
          });
        } else {
          console.log("[Preview] Component unmounted or polling stopped during execution");
        }
      } catch (err) {
        console.error("[Preview] Error during polling:", err);
        
        // If component is still mounted, schedule next poll
        if (mountedRef.current && isPollingRef.current && pollingFunctionRef.current) {
          console.log(`[Preview] Scheduling next poll after error in ${pollInterval}ms`);
          if (pollingRef.current !== null) {
            clearTimeout(pollingRef.current);
          }
          pollingRef.current = window.setTimeout(poll, pollInterval);
        }
      }
    };
    
    // Start the initial poll immediately
    poll();
    
    // Return a cleanup function
    return () => {
      console.log("[Preview] Cleaning up polling");
      if (pollingRef.current !== null) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      isPollingRef.current = false;
      pollingFunctionRef.current = null;
    };
  }, [maxPollCount, pollCount, pollInterval, resetPolling]);
  
  // Function to handle polling errors
  const handlePollingError = useCallback(() => {
    consecutiveErrorsRef.current += 1;
    console.log(`[Preview] Polling error: ${consecutiveErrorsRef.current}/${maxConsecutiveErrors}`);
    
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
    console.log("[Preview] Polling success, resetting error counter");
    consecutiveErrorsRef.current = 0;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[Preview] Component unmounting, cleaning up polling");
      mountedRef.current = false;
      
      if (pollingRef.current !== null) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      
      isPollingRef.current = false;
      pollingFunctionRef.current = null;
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
