
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { executeDataset } from "@/api/datasets/execution/executeDatasetApi";

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
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeAttempts, setExecuteAttempts] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const handleRunClick = useCallback(async () => {
    console.log("RUN BUTTON CLICKED in DatasetActions");
    
    setIsExecuting(true);
    setExecuteAttempts(prev => prev + 1);
    
    try {
      // Actually execute the dataset
      console.log("Directly executing dataset with ID:", datasetId);
      const result = await executeDataset(datasetId);
      console.log("Dataset execution result:", result);
      
      if (result && result.executionId) {
        console.log("Execution started successfully with ID:", result.executionId);
        toast({
          title: "Dataset Execution Started",
          description: "Dataset execution has been initiated. Results will be available in preview when complete.",
        });
        
        // Notify parent component about the execution
        if (onExecutionStarted) {
          onExecutionStarted(result.executionId);
        }
        
        // Refresh the list to update
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error("Error executing dataset from DatasetActions:", error);
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Failed to execute the dataset",
        variant: "destructive"
      });
      
      // Increment retry count for tracking purposes
      setRetryCount(prev => prev + 1);
      
      // Auto-retry if fewer than 3 retries have been attempted
      if (retryCount < 2) {
        toast({
          title: "Retrying Execution",
          description: `Automatically retrying dataset execution (${retryCount + 1}/3)...`,
          variant: "default"
        });
        
        // Wait briefly then retry
        setTimeout(() => {
          handleRunClick();
        }, 2000);
      }
    } finally {
      setIsExecuting(false);
    }
  }, [datasetId, retryCount, toast, onExecutionStarted, onRefresh]);

  return {
    isExecuting,
    executeAttempts,
    retryCount,
    handleRunClick
  };
}
