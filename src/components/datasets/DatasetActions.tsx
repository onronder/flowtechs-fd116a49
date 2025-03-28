
import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, Play, Loader2 } from "lucide-react";
import { DatasetActionsMenu } from "./actions/DatasetActionsMenu";
import { DatasetExportAction } from "./actions/DatasetExportAction";
import { useRunDatasetJob } from "@/hooks/useRunDatasetJob";

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
  datasetName?: string;
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
  errorState = false,
  datasetName = "dataset"
}: DatasetActionsProps) {
  // Use the new hook for dataset execution
  const { run, loading, error } = useRunDatasetJob();
  
  // For debugging
  React.useEffect(() => {
    console.log(`DatasetActions: datasetId=${datasetId}, isRunning=${isRunning}, lastExecutionId=${lastExecutionId || 'none'}`);
  }, [isRunning, datasetId, lastExecutionId]);
  
  // Handler for running the dataset with the new execution engine
  const handleRunButtonClick = async () => {
    console.log("Running new dataset engine for:", datasetId);
    // Notify parent that we're running
    onRunDataset();
    
    try {
      // Run the dataset using the new hook
      const executionId = await run(datasetId);
      
      // If we got an execution ID, notify the parent
      if (executionId && onExecutionStarted) {
        onExecutionStarted(executionId);
      }
      
      // Refresh the dataset list if needed
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error running dataset:", error);
    }
  };
  
  return (
    <div className="flex justify-between items-center w-full">
      {/* Preview button */}
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
        {/* Run button */}
        <Button 
          variant={errorState ? "destructive" : "default"}
          size="sm"
          onClick={handleRunButtonClick}
          disabled={loading || isRunning}
          data-testid="run-dataset-button"
          id="run-dataset-button"
          name="run-dataset-button"
        >
          {loading || isRunning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          {loading || isRunning ? "Running..." : (errorState ? "Retry" : "Run")}
        </Button>
        
        {/* Export action */}
        {lastExecutionId && (
          <DatasetExportAction
            executionId={lastExecutionId}
            datasetName={datasetName}
          />
        )}
        
        {/* Dataset actions menu */}
        <DatasetActionsMenu
          onViewPreview={onViewPreview}
          onScheduleDataset={onScheduleDataset}
          onDeleteDataset={onDeleteDataset}
        />
      </div>
    </div>
  );
}
