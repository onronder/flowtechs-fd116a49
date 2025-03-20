
import { useState } from "react";
import { formatDistance } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Play, Download, Edit, Trash, Eye, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { executeDataset, deleteDataset, scheduleDatasetExecution } from "@/api/datasetsApi";
import DatasetPreviewModal from "./DatasetPreviewModal";
import { DatasetSchedule } from "@/api/datasets/datasetsApiTypes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper function to get type-specific icon and color
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
  const typeStyles = getDatasetTypeStyles(dataset.dataset_type);

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
      const scheduleConfig: DatasetSchedule = { 
        type: "hourly",
        minute: 0 
      };
      
      await scheduleDatasetExecution(dataset.id, scheduleConfig);
      
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
                  formatDistance(new Date(dataset.last_execution_time), new Date(), { addSuffix: true }) : 
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
                  <DropdownMenuItem onClick={handleScheduleHourly}>
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Hourly
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)} 
                    className="text-red-600"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {showPreview && executionId && (
          <DatasetPreviewModal
            executionId={executionId}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
          />
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the dataset "{dataset.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteDataset();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
