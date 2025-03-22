
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
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

  // Use the most restrictive state - either parent or local
  const buttonDisabled = isRunning || localIsRunning;

  // For debugging
  useEffect(() => {
    console.log(`DatasetRunButton rendered for dataset: ${datasetId}, isRunning: ${isRunning}`);
  }, [datasetId, isRunning]);

  async function handleRunDataset() {
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
      
      // Execute the dataset with proper error handling
      console.log("Calling executeDataset API with ID:", datasetId);
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
  }

  return (
    <div>
      <Button 
        variant="default" 
        size="sm"
        onClick={handleRunDataset}
        disabled={buttonDisabled}
      >
        <Play className="h-4 w-4 mr-1" />
        {buttonDisabled ? "Running..." : "Run"}
      </Button>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
}
