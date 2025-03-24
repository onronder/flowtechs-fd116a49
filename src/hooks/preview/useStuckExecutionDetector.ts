
import { useState, useEffect } from "react";
import { PreviewData } from "./previewTypes";

interface StuckExecutionDetectorProps {
  isOpen: boolean;
  executionId: string | null;
  previewData: PreviewData | null;
  startTime: string | null;
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

  // Check for potentially stuck executions
  useEffect(() => {
    if (!isOpen || !executionId || !startTime || !previewData) {
      setShouldShowStuckUi(false);
      return;
    }

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

  return { shouldShowStuckUi };
}
