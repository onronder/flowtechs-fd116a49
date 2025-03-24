
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import DatasetMetadata from "./DatasetMetadata";
import DatasetInfo from "./DatasetInfo";
import DatasetActions from "./DatasetActions";
import { useToast } from "@/hooks/use-toast";
import DatasetDeletion from "./cards/DatasetDeletion";
import DatasetPreview from "./cards/DatasetPreview";
import DatasetScheduler from "./cards/DatasetScheduler";
import { resetStuckExecutions } from "@/api/datasets/execution/executionResetApi";
import { createSecureSourceObject } from "@/api/utils/securityUtils";

interface DatasetCardProps {
  dataset: any;
  onRefresh: () => void;
}

export default function DatasetCard({ dataset, onRefresh }: DatasetCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(dataset.last_execution_id || null);
  const deletionRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  const { handleScheduleHourly } = DatasetScheduler({ datasetId: dataset.id, onRefresh });
  const cardMountedRef = useRef(true);

  // Create a secure version of the dataset for logging
  const securedDataset = useCallback(() => {
    const securedData = { ...dataset };
    
    if (securedData.source) {
      securedData.source = createSecureSourceObject(securedData.source);
    }
    
    return securedData;
  }, [dataset]);

  // Monitor and check for stuck executions
  useEffect(() => {
    cardMountedRef.current = true;
    const safeDataset = securedDataset();
    console.log("Dataset card rendered:", safeDataset.id, safeDataset.name);
    
    if (safeDataset.last_execution_id && safeDataset.last_execution_time) {
      const executionTime = new Date(safeDataset.last_execution_time).getTime();
      const currentTime = new Date().getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (currentTime - executionTime > thirtyMinutes && 
          safeDataset.last_execution_status && 
          !['completed', 'failed'].includes(safeDataset.last_execution_status)) {
        console.log(`Execution ${safeDataset.last_execution_id} may be stuck, checking...`);
        resetStuckExecutions(dataset.id, safeDataset.last_execution_id)
          .then(({ resetCount }) => {
            if (resetCount > 0 && cardMountedRef.current) {
              console.log(`Reset stuck execution ${safeDataset.last_execution_id}`);
              onRefresh();
            }
          })
          .catch(error => {
            console.error("Error checking stuck execution:", error);
          });
      }
    }
    
    return () => {
      cardMountedRef.current = false;
    };
  }, [dataset, onRefresh, securedDataset]);

  // Update running state when dataset changes
  useEffect(() => {
    setIsRunning(dataset.last_execution_status === 'running' || dataset.last_execution_status === 'pending');
  }, [dataset]);

  // Handler for viewing the preview
  const handleViewPreview = useCallback(() => {
    if (dataset.last_execution_id) {
      console.log("Viewing preview for execution ID:", dataset.last_execution_id);
      setExecutionId(dataset.last_execution_id);
      setShowPreview(true);
    } else {
      toast({
        title: "No Data Available",
        description: "This dataset has not been executed yet. Run it first to see results.",
        variant: "destructive"
      });
    }
  }, [dataset.last_execution_id, toast]);

  // Handler for when an execution starts
  const handleExecutionStarted = useCallback((newExecutionId: string) => {
    console.log("Execution started with ID:", newExecutionId);
    setExecutionId(newExecutionId);
    setIsRunning(false);
    setShowPreview(true);
  }, []);

  // Handler for clicking the run dataset button
  const handleRunDatasetClick = useCallback(() => {
    console.log("Set running state to true for dataset:", dataset.id);
    setIsRunning(true);
  }, [dataset.id]);

  // Handler for clicking delete dataset
  const handleDeleteDatasetClick = useCallback(() => {
    if (deletionRef.current) {
      deletionRef.current.click();
    }
  }, []);

  // Handler for closing the preview modal
  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    // Always refresh the dataset list when the preview modal is closed
    onRefresh();
  }, [onRefresh]);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6">
          <DatasetMetadata 
            name={dataset.name}
            description={dataset.description}
            datasetType={dataset.dataset_type}
          />
          
          <DatasetInfo
            sourceName={dataset.source?.name}
            lastExecutionTime={dataset.last_execution_time}
            rowCount={dataset.last_row_count}
            schedule={dataset.schedule}
          />
          
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <DatasetActions
              datasetId={dataset.id}
              lastExecutionId={dataset.last_execution_id}
              isRunning={isRunning}
              schedule={dataset.schedule}
              onViewPreview={handleViewPreview}
              onRunDataset={handleRunDatasetClick}
              onScheduleDataset={handleScheduleHourly}
              onDeleteDataset={handleDeleteDatasetClick}
              onExecutionStarted={handleExecutionStarted}
              onRefresh={onRefresh}
              datasetName={dataset.name}
            />
          </div>
        </div>
      </Card>

      <DatasetPreview
        executionId={executionId}
        isOpen={showPreview}
        onClose={handleClosePreview}
      />
      
      <DatasetDeletion
        datasetId={dataset.id}
        datasetName={dataset.name}
        onRefresh={onRefresh}
        ref={deletionRef}
      />
    </>
  );
}
