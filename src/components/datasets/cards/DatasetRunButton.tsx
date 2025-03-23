
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { executeDataset } from "@/api/datasets/execution/executeDatasetApi";
import { useToast } from "@/hooks/use-toast";

interface DatasetRunButtonProps {
  datasetId: string;
  isRunning: boolean;
  onExecutionStarted: (executionId: string) => void;
  onRefresh: () => void;
}

export default function DatasetRunButton({
  datasetId,
  isRunning,
  onExecutionStarted,
  onRefresh
}: DatasetRunButtonProps) {
  const { toast } = useToast();
  const [localIsRunning, setLocalIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Use the most restrictive state - either parent or local
  const buttonDisabled = isRunning || localIsRunning;

  // For debugging
  useEffect(() => {
    console.log(`DatasetRunButton rendered for dataset: ${datasetId}, isRunning: ${isRunning}, localIsRunning: ${localIsRunning}`);
    
    // If the button was previously running but parent state has reset, clear local state too
    if (localIsRunning && !isRunning && retryCount === 0) {
      console.log(`Resetting local running state to match parent state for dataset: ${datasetId}`);
      setLocalIsRunning(false);
    }
  }, [datasetId, isRunning, localIsRunning, retryCount]);

  const handleRunDataset = useCallback(async () => {
    try {
      // Reset error state
      setError(null);
      
      // Validate dataset ID
      if (!datasetId) {
        console.error("Invalid dataset ID:", datasetId);
        throw new Error("Invalid dataset ID");
      }
      
      // Set local running state to true
      setLocalIsRunning(true);
      console.log("Starting dataset execution with dataset ID:", datasetId);
      
      // Track retry attempt
      const currentRetry = retryCount;
      if (currentRetry > 0) {
        console.log(`Retry attempt ${currentRetry} for dataset ID: ${datasetId}`);
      }
      
      // Execute the dataset with proper error handling
      console.log("Calling executeDataset API with ID:", datasetId);
      
      // This is the key API call that triggers the execution
      const result = await executeDataset(datasetId);
      
      console.log("Execution result received:", result);
      
      // Validate the result
      if (!result) {
        throw new Error("No response received from execution API");
      }
      
      if (!result.executionId) {
        console.error("Invalid execution result format:", result);
        throw new Error("Invalid response from execution function - missing executionId");
      }
      
      // Reset retry count on success
      if (currentRetry > 0) {
        setRetryCount(0);
      }
      
      // Call the parent callback with the execution ID
      console.log("Execution started successfully, execution ID:", result.executionId);
      onExecutionStarted(result.executionId);
      
      toast({
        title: "Dataset Execution Started",
        description: "Dataset execution has been initiated. Results will be available in preview when complete.",
      });
      
      // Refresh the list to update last execution time
      onRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to execute the dataset";
      setError(errorMessage);
      console.error("Error executing dataset:", error);
      
      // Increment retry count for tracking purposes
      setRetryCount(prev => prev + 1);
      
      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      // Always make sure to reset the loading state
      console.log("Resetting local running state for dataset:", datasetId);
      setLocalIsRunning(false);
    }
  }, [datasetId, onExecutionStarted, onRefresh, toast, retryCount]);

  return (
    <div>
      <Button 
        variant="default" 
        size="sm"
        onClick={handleRunDataset}
        disabled={buttonDisabled}
      >
        {buttonDisabled ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-1" />
            {retryCount > 0 ? "Retry Run" : "Run"}
          </>
        )}
      </Button>
      {error && (
        <div className="text-red-500 text-xs mt-1 max-w-[200px] break-words">
          {error}
        </div>
      )}
    </div>
  );
}
