import { useState, useEffect } from "react";
import { PreviewData } from "./previewTypes";

interface StuckExecutionDetectorProps {
  isOpen: boolean;
  executionId: string | null;
  previewData: PreviewData | null;
  startTime: string;
  pollCount: number;
}

export function useStuckExecutionDetector({
  isOpen,
  executionId,
  previewData,
  startTime,
  pollCount
}: StuckExecutionDetectorProps) {
  const [shouldShowStuckUi, setShouldShowStuckUi] = useState(false);
  
  useEffect(() => {
    if (!isOpen || !executionId || !previewData) {
      setShouldShowStuckUi(false);
      return;
    }
    
    // If status is already completed or failed, it's not stuck
    if (previewData.status === 'completed' || previewData.status === 'failed' || previewData.status === 'stuck') {
      console.log(`[StuckDetector] Execution ${executionId} status is ${previewData.status}, not stuck`);
      setShouldShowStuckUi(false);
      return;
    }
    
    // If we have polled many times and still in pending/running, it might be stuck
    const minimumPollsBeforeStuck = 45; // 90 seconds at 2-second intervals
    
    if ((previewData.status === 'pending' || previewData.status === 'running') && pollCount > minimumPollsBeforeStuck) {
      console.log(`[StuckDetector] Execution ${executionId} appears stuck: status=${previewData.status}, pollCount=${pollCount}`);
      
      // Check if the execution has been running for too long
      if (previewData.execution?.startTime) {
        const executionStart = new Date(previewData.execution.startTime).getTime();
        const now = new Date().getTime();
        const executionTimeMs = now - executionStart;
        const maxExecutionTimeMs = 120000; // 2 minutes
        
        if (executionTimeMs > maxExecutionTimeMs) {
          console.log(`[StuckDetector] Execution ${executionId} running for ${executionTimeMs}ms, exceeds max time of ${maxExecutionTimeMs}ms`);
          setShouldShowStuckUi(true);
          return;
        }
      }
      
      // If we don't have a startTime from the execution, use our local polling startTime
      const pollingStart = new Date(startTime).getTime();
      const now = new Date().getTime();
      const pollingTimeMs = now - pollingStart;
      const maxPollingTimeMs = 180000; // 3 minutes
      
      if (pollingTimeMs > maxPollingTimeMs) {
        console.log(`[StuckDetector] Polling for ${executionId} has been active for ${pollingTimeMs}ms, exceeds max time of ${maxPollingTimeMs}ms`);
        setShouldShowStuckUi(true);
        return;
      }
    }
    
    setShouldShowStuckUi(false);
  }, [isOpen, executionId, previewData, startTime, pollCount]);
  
  return { shouldShowStuckUi };
}
