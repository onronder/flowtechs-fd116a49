
import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface PollingOptions {
  maxPollCount?: number;
  pollInterval?: number;
  maxConsecutiveErrors?: number;
}

export function usePreviewPolling({
  maxPollCount = 120, // 4 minutes at 2-second intervals
  pollInterval = 2000, // 2 seconds between polls
  maxConsecutiveErrors = 3
}: PollingOptions = {}) {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const mountedRef = useRef(true);
  const startTimeRef = useRef<string | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const { toast } = useToast();
  
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
  
  // Function to start polling
  const startPolling = useCallback((callback: () => Promise<void>) => {
    resetPolling();
    startTimeRef.current = new Date().toISOString();
    
    // Initial load
    callback();
    
    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      if (pollCountRef.current >= maxPollCount) {
        console.log("[Preview] Max polling attempts reached, stopping polling");
        resetPolling();
        
        toast({
          title: "Execution Timeout",
          description: "The dataset execution is taking longer than expected. Please try again later.",
          variant: "destructive"
        });
        return;
      }
      
      pollCountRef.current++;
      console.log(`[Preview] Polling attempt ${pollCountRef.current}/${maxPollCount}`);
      callback();
    }, pollInterval);
    
    return () => {
      resetPolling();
    };
  }, [maxPollCount, pollInterval, resetPolling, toast]);
  
  // Function to handle consecutive errors
  const handlePollingError = useCallback(() => {
    consecutiveErrorsRef.current++;
    
    // If we've hit too many consecutive errors, stop polling
    if (consecutiveErrorsRef.current >= maxConsecutiveErrors) {
      console.log(`[Preview] ${maxConsecutiveErrors} consecutive errors, stopping polling`);
      resetPolling();
      
      toast({
        title: "Error",
        description: "Failed to load dataset preview after multiple attempts",
        variant: "destructive"
      });
      
      return true; // Polling stopped
    }
    
    return false; // Polling continues
  }, [maxConsecutiveErrors, resetPolling, toast]);
  
  // Function to handle polling success
  const handlePollingSuccess = useCallback(() => {
    // Reset consecutive errors counter on success
    consecutiveErrorsRef.current = 0;
  }, []);
  
  return {
    pollCount: pollCountRef.current,
    maxPollCount,
    startTime: startTimeRef.current,
    startPolling,
    resetPolling,
    handlePollingError,
    handlePollingSuccess,
    isMounted: () => mountedRef.current
  };
}
