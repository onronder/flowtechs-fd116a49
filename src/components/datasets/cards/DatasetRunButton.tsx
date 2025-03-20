
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { executeDataset } from "@/api/datasetsApi";
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

  async function handleRunDataset() {
    try {
      // Validate dataset ID
      if (!datasetId) {
        console.error("Invalid dataset ID:", datasetId);
        throw new Error("Invalid dataset ID");
      }
      
      console.log("Starting dataset execution with dataset ID:", datasetId);
      
      // Execute the dataset with proper error handling
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
    }
  }

  return (
    <Button 
      variant="default" 
      size="sm"
      onClick={handleRunDataset}
      disabled={isRunning}
    >
      <Play className="h-4 w-4 mr-1" />
      {isRunning ? "Running..." : "Run"}
    </Button>
  );
}
