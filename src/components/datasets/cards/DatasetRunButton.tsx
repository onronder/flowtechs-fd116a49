
import { useState } from "react";
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

  // Use the most restrictive state - either parent or local
  const buttonDisabled = isRunning || localIsRunning;

  async function handleRunDataset() {
    try {
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
        title: "Dataset Executed",
        description: "Dataset execution has been initiated.",
      });
      
      // Refresh the list to update last execution time
      onRefresh();
    } catch (error) {
      console.error("Error executing dataset:", error);
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Failed to execute the dataset. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Always make sure to reset the loading state
      console.log("Resetting local running state for dataset:", datasetId);
      setLocalIsRunning(false);
    }
  }

  return (
    <Button 
      variant="default" 
      size="sm"
      onClick={handleRunDataset}
      disabled={buttonDisabled}
    >
      <Play className="h-4 w-4 mr-1" />
      {buttonDisabled ? "Running..." : "Run"}
    </Button>
  );
}
