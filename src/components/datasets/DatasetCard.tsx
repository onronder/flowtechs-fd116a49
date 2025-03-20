
import { useState } from "react";
import { Card } from "@/components/ui/card";
import DatasetMetadata from "./DatasetMetadata";
import DatasetInfo from "./DatasetInfo";
import DatasetActions from "./DatasetActions";
import DatasetPreviewModal from "./DatasetPreviewModal";
import DatasetDeleteDialog from "./DatasetDeleteDialog";
import { executeDataset, deleteDataset } from "@/api/datasetsApi";
import { useToast } from "@/hooks/use-toast";
import { DatasetSchedule } from "@/api/datasets/datasetsApiTypes";

interface DatasetCardProps {
  dataset: any;
  onRefresh: () => void;
}

export default function DatasetCard({ dataset, onRefresh }: DatasetCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleRunDataset() {
    try {
      setIsRunning(true);
      
      // Log the dataset ID before calling executeDataset
      console.log("Executing dataset with ID:", dataset.id);
      
      const result = await executeDataset(dataset.id);
      console.log("Execution result:", result);
      
      setExecutionId(result.executionId);
      setShowPreview(true);
      toast({
        title: "Dataset Executed",
        description: "Dataset execution has been initiated.",
      });
      // Refresh the list to update last execution time
      onRefresh();
    } catch (error) {
      console.error("Error executing dataset:", error);
      toast({
        title: "Error",
        description: "Failed to execute the dataset. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleDeleteDataset() {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      await deleteDataset(dataset.id);
      
      toast({
        title: "Dataset Deleted",
        description: "The dataset has been deleted successfully.",
      });
      
      onRefresh();
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error("Error deleting dataset:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to delete the dataset. Please try again.";
      
      if (error.code === "42501") {
        errorMessage = "You don't have permission to delete this dataset.";
      } else if (error.code === "23503") {
        errorMessage = "Cannot delete this dataset because it has related records that cannot be automatically removed.";
      } else if (error.status === 409 || error.code === "P0001") {
        errorMessage = "Cannot delete this dataset due to conflicts with existing data.";
      } else if (error.code === "P0002") {
        errorMessage = "Dataset not found. It may have been already deleted.";
      }
      
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }

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

  async function handleScheduleHourly() {
    try {
      // Use the correct type for DatasetSchedule
      const scheduleConfig: DatasetSchedule = { 
        type: "hourly",
        minute: 0 
      };
      
      await import('@/api/datasets/datasetSchedulingApi').then(module => {
        return module.scheduleDatasetExecution(dataset.id, scheduleConfig);
      });
      
      toast({
        title: "Dataset Scheduled",
        description: "This dataset will run automatically every hour.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error scheduling dataset:", error);
      toast({
        title: "Error",
        description: "Failed to schedule the dataset. Please try again.",
        variant: "destructive"
      });
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
          
          <DatasetActions
            datasetId={dataset.id}
            lastExecutionId={dataset.last_execution_id}
            isRunning={isRunning}
            schedule={dataset.schedule}
            onViewPreview={handleViewPreview}
            onRunDataset={handleRunDataset}
            onScheduleDataset={handleScheduleHourly}
            onDeleteDataset={() => setShowDeleteDialog(true)}
          />
        </div>
      </Card>

      {showPreview && executionId && (
        <DatasetPreviewModal
          executionId={executionId}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
      
      <DatasetDeleteDialog
        datasetName={dataset.name}
        isOpen={showDeleteDialog}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteDataset}
      />
    </>
  );
}
