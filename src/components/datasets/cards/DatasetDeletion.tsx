
import { useState, forwardRef, ForwardedRef } from "react";
import { deleteDataset } from "@/api/datasetsApi";
import { useToast } from "@/hooks/use-toast";
import DatasetDeleteDialog from "../DatasetDeleteDialog";

interface DatasetDeletionProps {
  datasetId: string;
  datasetName: string;
  onRefresh: () => void;
}

const DatasetDeletion = forwardRef<HTMLButtonElement, DatasetDeletionProps>(({ 
  datasetId, 
  datasetName, 
  onRefresh 
}, ref: ForwardedRef<HTMLButtonElement>) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleDeleteDataset() {
    if (isDeleting) return; // Prevent multiple submissions
    
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      await deleteDataset(datasetId);
      
      toast({
        title: "Dataset Deleted",
        description: "The dataset has been deleted successfully.",
      });
      
      // Close the dialog first before refreshing
      setShowDeleteDialog(false);
      
      // Small delay to ensure the dialog closes properly before refreshing
      setTimeout(() => {
        onRefresh();
      }, 100);
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

  const handleCancel = () => {
    // Make sure we're not in the middle of deleting
    if (!isDeleting) {
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <DatasetDeleteDialog
        datasetName={datasetName}
        isOpen={showDeleteDialog}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={handleCancel}
        onConfirm={handleDeleteDataset}
      />
      
      <button 
        type="button" 
        className="hidden" 
        onClick={() => setShowDeleteDialog(true)}
        ref={ref}
      >
        Delete
      </button>
    </>
  );
});

// Add display name for better debugging
DatasetDeletion.displayName = "DatasetDeletion";

export default DatasetDeletion;
