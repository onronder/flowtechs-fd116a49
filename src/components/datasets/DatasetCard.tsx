
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { executeDataset, deleteDataset } from "@/api/datasetsApi";
import DatasetMetadata from "./DatasetMetadata";
import DatasetInfo from "./DatasetInfo";
import DatasetActions from "./DatasetActions";

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
};

interface DatasetCardProps {
  dataset: Dataset;
  onRefresh: () => void;
}

export default function DatasetCard({ dataset, onRefresh }: DatasetCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  
  async function handleRunDataset() {
    try {
      setIsRunning(true);
      
      await executeDataset(dataset.id);
      
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
      toast({
        title: "Preview Available Soon",
        description: "Dataset preview functionality is coming soon.",
      });
    } else {
      toast({
        title: "No Data Available",
        description: "This dataset has not been executed yet. Run it first to see results.",
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
        />
        
        <DatasetActions 
          datasetId={dataset.id}
          lastExecutionId={dataset.last_execution_id}
          isRunning={isRunning}
          onViewPreview={handleViewPreview}
          onRunDataset={handleRunDataset}
          onDeleteDataset={handleDeleteDataset}
        />
      </CardContent>
    </Card>
  );
}
