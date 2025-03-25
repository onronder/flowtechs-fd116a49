
import React from "react";
import { PreviewButton } from "./actions/PreviewButton";
import { RunButton } from "./actions/RunButton";
import { DatasetActionsMenu } from "./actions/DatasetActionsMenu";
import { useDatasetExecution } from "./actions/useDatasetExecution";
import { DatasetExportAction } from "./actions/DatasetExportAction";

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
  // Use the custom hook to handle execution logic
  const { isExecuting, handleRunClick } = useDatasetExecution({
    datasetId,
    onExecutionStarted,
    onRefresh
  });
  
  // For debugging
  React.useEffect(() => {
    console.log(`DatasetActions: datasetId=${datasetId}, isRunning=${isRunning}, lastExecutionId=${lastExecutionId || 'none'}`);
  }, [isRunning, datasetId, lastExecutionId]);
  
  // Handler for clicking the run button
  const handleRunButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    console.log("Set running state to true for dataset:", datasetId);
    onRunDataset();
    handleRunClick();
  };
  
  // Handle menu actions with proper event handling
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    onDeleteDataset();
  };
  
  const handleScheduleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    onScheduleDataset();
  };
  
  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    onViewPreview();
  };
  
  return (
    <div className="flex justify-between items-center w-full">
      <PreviewButton 
        onClick={handlePreviewClick}
        disabled={!lastExecutionId}
      />
      
      <div className="flex space-x-2">
        <RunButton 
          onClick={handleRunButtonClick}
          isRunning={isRunning}
          isExecuting={isExecuting}
          errorState={errorState}
        />
        
        {lastExecutionId && (
          <DatasetExportAction
            executionId={lastExecutionId}
            datasetName={datasetName}
          />
        )}
        
        <DatasetActionsMenu
          onViewPreview={handlePreviewClick}
          onScheduleDataset={handleScheduleClick}
          onDeleteDataset={handleDeleteClick}
        />
      </div>
    </div>
  );
}
