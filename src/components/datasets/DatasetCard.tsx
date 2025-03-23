
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import DatasetMetadata from "./DatasetMetadata";
import DatasetInfo from "./DatasetInfo";
import DatasetActions from "./DatasetActions";
import { useToast } from "@/hooks/use-toast";
import DatasetDeletion from "./cards/DatasetDeletion";
import DatasetPreview from "./cards/DatasetPreview";
import DatasetScheduler from "./cards/DatasetScheduler";

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

  // Debug dataset info
  useEffect(() => {
    console.log("Dataset card rendered:", dataset.id, dataset.name);
    console.log("Dataset source:", dataset.source);
    console.log("Last execution ID:", dataset.last_execution_id);
  }, [dataset]);

  // Reset running state when dataset changes (after refresh)
  useEffect(() => {
    setIsRunning(false);
  }, [dataset]);

  const handleViewPreview = useCallback(() => {
    // Use the most recent execution ID if available
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

  const handleExecutionStarted = useCallback((newExecutionId: string) => {
    console.log("Execution started with ID:", newExecutionId);
    setExecutionId(newExecutionId);
    setIsRunning(false); // Reset running state here to ensure button is re-enabled
    setShowPreview(true); // Show preview immediately
  }, []);

  const handleRunDatasetClick = useCallback(() => {
    console.log("Set running state to true for dataset:", dataset.id);
    setIsRunning(true);
  }, [dataset.id]);

  const handleDeleteDatasetClick = useCallback(() => {
    if (deletionRef.current) {
      deletionRef.current.click();
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    // When preview is closed, refresh the datasets to ensure we have the latest data
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
