
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Play, Download, Edit, Trash, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { executeDataset, deleteDataset } from "@/api/datasetsApi";

// Helper function to get type-specific styles
function getDatasetTypeStyles(type: string) {
  switch (type) {
    case 'predefined':
      return { bgColor: 'bg-blue-500', color: 'text-blue-500', label: 'Predefined' };
    case 'dependent':
      return { bgColor: 'bg-purple-500', color: 'text-purple-500', label: 'Dependent' };
    case 'custom':
      return { bgColor: 'bg-amber-500', color: 'text-amber-500', label: 'Custom' };
    default:
      return { bgColor: 'bg-gray-500', color: 'text-gray-500', label: 'Unknown' };
  }
}

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
  
  const typeStyles = getDatasetTypeStyles(dataset.dataset_type);

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
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium">{dataset.name}</h3>
            {dataset.description && (
              <p className="text-sm text-muted-foreground mt-1">{dataset.description}</p>
            )}
          </div>
          
          <Badge variant="outline" className={typeStyles.color}>{typeStyles.label}</Badge>
        </div>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Source:</span>
            <span className="font-medium">{dataset.source?.name || "Unknown"}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Last Run:</span>
            <span>
              {dataset.last_execution_time ? 
                new Date(dataset.last_execution_time).toLocaleString() : 
                "Never"}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Row Count:</span>
            <span>{dataset.last_row_count || 0}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewPreview}
            disabled={!dataset.last_execution_id}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={handleRunDataset}
              disabled={isRunning}
            >
              <Play className="h-4 w-4 mr-1" />
              {isRunning ? "Running..." : "Run"}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewPreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Results
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Export functionality will be available soon." })}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Edit functionality will be available soon." })}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteDataset} className="text-red-600">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
