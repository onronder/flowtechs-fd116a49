
import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import DatasetMetadata from "./DatasetMetadata";
import DatasetInfo from "./DatasetInfo";
import DatasetActions from "./DatasetActions";
import { useToast } from "@/hooks/use-toast";
import DatasetRunButton from "./cards/DatasetRunButton";
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

  function handleViewPreview() {
    // Use the most recent execution ID if available
    if (dataset.last_execution_id) {
      setExecutionId(dataset.last_execution_id);
      setShowPreview(true);
    } else {
      toast({
        title: "No Data Available",
        description: "This dataset has not been executed yet. Run it first to see results.",
        variant: "destructive"
      });
    }
  }

  function handleExecutionStarted(newExecutionId: string) {
    setIsRunning(false);
    setExecutionId(newExecutionId);
    setShowPreview(true);
  }

  function handleRunDatasetClick() {
    setIsRunning(true);
  }

  function handleDeleteDatasetClick() {
    if (deletionRef.current) {
      deletionRef.current.click();
    }
  }

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
            />
          </div>
        </div>
      </Card>

      <DatasetPreview
        executionId={executionId}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
      
      <DatasetDeletion
        datasetId={dataset.id}
        datasetName={dataset.name}
        onRefresh={onRefresh}
        ref={deletionRef}
      />

      {/* This component is invisible but handles the run dataset functionality */}
      <div className="hidden">
        <DatasetRunButton
          datasetId={dataset.id}
          isRunning={isRunning}
          onExecutionStarted={handleExecutionStarted}
          onRefresh={onRefresh}
        />
      </div>
    </>
  );
}
