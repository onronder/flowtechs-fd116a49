
import { useState } from "react";
import { useRunDatasetJob } from "@/hooks/useRunDatasetJob";

interface UseDatasetExecutionProps {
  datasetId: string;
  onExecutionStarted?: (executionId: string) => void;
  onRefresh?: () => void;
}

export function useDatasetExecution({
  datasetId,
  onExecutionStarted,
  onRefresh
}: UseDatasetExecutionProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const { run, loading, error } = useRunDatasetJob();

  const handleRunClick = async () => {
    setIsExecuting(true);
    
    try {
      const executionId = await run(datasetId);
      
      if (executionId && onExecutionStarted) {
        onExecutionStarted(executionId);
      }
      
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    isExecuting: isExecuting || loading,
    error,
    handleRunClick
  };
}
