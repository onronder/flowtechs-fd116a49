
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Play, Download, Edit, Trash, Eye, Clock, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { executeDataset } from "@/api/datasets/execution/executeDatasetApi";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DatasetActionsProps {
  datasetId: string;
  lastExecutionId?: string;
  isRunning: boolean;
  schedule?: {
    id: string;
    type: string;
    next_run_time?: string;
    is_active: boolean;
  };
  onViewPreview: () => void;
  onRunDataset: () => void;
  onScheduleDataset: () => void;
  onDeleteDataset: () => void;
  onExecutionStarted?: (executionId: string) => void;
  onRefresh?: () => void;
  errorState?: boolean;
}

export default function DatasetActions({
  datasetId,
  lastExecutionId,
  isRunning,
  schedule,
  onViewPreview,
  onRunDataset,
  onScheduleDataset,
  onDeleteDataset,
  onExecutionStarted,
  onRefresh,
  errorState = false
}: DatasetActionsProps) {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeAttempts, setExecuteAttempts] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  // For debugging
  useEffect(() => {
    console.log(`DatasetActions: datasetId=${datasetId}, isRunning=${isRunning}, lastExecutionId=${lastExecutionId || 'none'}`);
  }, [isRunning, datasetId, lastExecutionId]);
  
  const handleRunClick = async () => {
    console.log("RUN BUTTON CLICKED in DatasetActions");
    
    // Call the parent component's function to update UI state
    onRunDataset();
    
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
  };
  
  return (
    <div className="flex justify-between items-center w-full">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onViewPreview}
        disabled={!lastExecutionId}
      >
        <Eye className="h-4 w-4 mr-1" />
        Preview
      </Button>
      
      <div className="flex space-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={errorState ? "destructive" : "default"}
                size="sm"
                onClick={handleRunClick}
                disabled={isRunning || isExecuting}
                data-testid="run-dataset-button"
              >
                {errorState ? (
                  <AlertCircle className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {isRunning || isExecuting ? 
                  (isExecuting ? "Starting..." : "Running...") : 
                  (errorState ? "Retry" : "Run")}
              </Button>
            </TooltipTrigger>
            {errorState && (
              <TooltipContent>
                <p>Previous execution failed. Click to retry.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewPreview}>
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onScheduleDataset}>
              <Clock className="h-4 w-4 mr-2" />
              {schedule ? "Update Schedule" : "Schedule"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Export functionality will be available soon." })}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Edit functionality will be available soon." })}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteDataset} className="text-red-600">
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
