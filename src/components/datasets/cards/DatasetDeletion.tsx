
import { useState } from "react";
import { deleteDataset } from "@/api/datasetsApi";
import { useToast } from "@/hooks/use-toast";
import DatasetDeleteDialog from "../DatasetDeleteDialog";

interface DatasetDeletionProps {
  datasetId: string;
  datasetName: string;
  onRefresh: () => void;
}

export default function DatasetDeletion({ 
  datasetId, 
  datasetName, 
  onRefresh 
}: DatasetDeletionProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleDeleteDataset() {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      await deleteDataset(datasetId);
      
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

  return (
    <>
      <DatasetDeleteDialog
        datasetName={datasetName}
        isOpen={showDeleteDialog}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteDataset}
      />
      
      {/* Return the setShowDeleteDialog function for the parent to use */}
      <button type="button" className="hidden" onClick={() => setShowDeleteDialog(true)}>
        Delete
      </button>
    </>
  );
}
