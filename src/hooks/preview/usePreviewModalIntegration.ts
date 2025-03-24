
import { useCallback, useEffect, useState } from "react";

export function usePreviewModalIntegration(isOpen: boolean, executionId: string | null) {
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  
  // Update current execution ID when props change
  useEffect(() => {
    if (isOpen && executionId && executionId !== currentExecutionId) {
      setCurrentExecutionId(executionId);
      console.log(`[DatasetPreview] Modal opened with executionId: ${executionId}, loading preview data`);
    }
  }, [executionId, isOpen, currentExecutionId]);
  
  // Handle cleanup
  const cleanup = useCallback(() => {
    if (!isOpen) {
      console.log("[DatasetPreview] Cleanup on modal close");
      // Don't reset currentExecutionId to allow caching between opens
    }
  }, [isOpen]);
  
  // Clean up when component unmounts or modal closes
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [isOpen, cleanup]);
  
  return {
    currentExecutionId
  };
}
