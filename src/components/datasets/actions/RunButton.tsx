
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, AlertCircle } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface RunButtonProps {
  onClick: () => void;
  isRunning: boolean;
  isExecuting: boolean;
  errorState: boolean;
}

export function RunButton({ onClick, isRunning, isExecuting, errorState }: RunButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={errorState ? "destructive" : "default"}
            size="sm"
            onClick={onClick}
            disabled={isRunning || isExecuting}
            data-testid="run-dataset-button"
            id="run-dataset-button"
            name="run-dataset-button"
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
  );
}
