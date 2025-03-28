
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, AlertCircle, Loader2 } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface RunButtonProps {
  datasetId?: string; // Make optional since we're not using it directly anymore
  onExecutionStarted?: (executionId: string) => void; // Make optional
  isRunning: boolean;
  isExecuting: boolean;
  errorState: boolean;
  onClick: () => void; // Add onClick handler
}

export function RunButton({ 
  isRunning, 
  isExecuting, 
  errorState,
  onClick
}: RunButtonProps) {
  // Combined loading state from both sources
  const isLoading = isRunning || isExecuting;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={errorState ? "destructive" : "default"}
            size="sm"
            onClick={onClick}
            disabled={isLoading}
            data-testid="run-dataset-button"
            id="run-dataset-button"
            name="run-dataset-button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : errorState ? (
              <AlertCircle className="h-4 w-4 mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {isLoading ? 
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
  );
}
