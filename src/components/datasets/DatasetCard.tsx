
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { executeDataset, deleteDataset, scheduleDatasetExecution } from "@/api/datasetsApi";
import DatasetMetadata from "./DatasetMetadata";
import DatasetInfo from "./DatasetInfo";
import DatasetActions from "./DatasetActions";
import DatasetPreviewModal from "./DatasetPreviewModal";

type Dataset = {
  id: string;
  name: string;
  description?: string;
  dataset_type: string;
  source?: {
    id: string;
    name: string;
    source_type: string;
  };
  last_execution_time?: string;
  last_row_count?: number;
  last_execution_id?: string;
  schedule?: {
    id: string;
    type: string;
    next_run_time?: string;
    is_active: boolean;
  };
};

interface DatasetCardProps {
  dataset: Dataset;
  onRefresh: () => void;
}

export default function DatasetCard({ dataset, onRefresh }: DatasetCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(dataset.last_execution_id || null);
  const { toast } = useToast();
  
  async function handleRunDataset() {
    try {
      setIsRunning(true);
      
      const result = await executeDataset(dataset.id);
      setExecutionId(result.executionId);
      setShowPreview(true);
      
      toast({
        title: "Dataset Executed",
        description: "Dataset execution has been initiated.",
      });
      
      // Refresh the list to update last execution time
      setTimeout(() => onRefresh(), 2000);
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
    if (confirm(`Are you sure you want to delete "${dataset.name}"? This action cannot be undone.`)) {
      try {
        await deleteDataset(dataset.id);
        
        toast({
          title: "Dataset Deleted",
          description: "The dataset has been deleted successfully.",
        });
        
        onRefresh();
      } catch (error) {
        console.error("Error deleting dataset:", error);
        toast({
          title: "Error",
          description: "Failed to delete the dataset. Please try again.",
          variant: "destructive"
        });
      }
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

  async function handleScheduleDataset() {
    try {
      // This is a simplified implementation - in a real app, you'd show a modal with scheduling options
      const schedule = {
        type: 'hourly',
        minute: new Date().getMinutes()
      };
      
      await scheduleDatasetExecution(dataset.id, schedule);
      
      toast({
        title: "Dataset Scheduled",
        description: "The dataset has been scheduled to run hourly.",
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
    <Card className="overflow-hidden">
      <CardContent className="p-6">
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
          onScheduleDataset={handleScheduleDataset}
          onDeleteDataset={handleDeleteDataset}
        />
      </CardContent>
      
      {showPreview && executionId && (
        <DatasetPreviewModal
          executionId={executionId}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Card>
  );
}
