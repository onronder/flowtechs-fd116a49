
import React, { useState, forwardRef, useImperativeHandle } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteDataset } from "@/api/datasetsApi";
import DatasetDeleteDialog from "@/components/datasets/DatasetDeleteDialog";

interface DatasetDeletionProps {
  datasetId: string;
  datasetName: string;
  onRefresh: () => void;
}

// Forward ref to allow parent components to trigger the deletion dialog
const DatasetDeletion = forwardRef<HTMLButtonElement, DatasetDeletionProps>(
  ({ datasetId, datasetName, onRefresh }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { toast } = useToast();

    // Expose the click method to parent components
    useImperativeHandle(ref, () => ({
      click: () => {
        setIsOpen(true);
      }
    }) as any);

    const handleCancel = () => {
      // Only allow cancellation if not currently deleting
      if (!isDeleting) {
        setIsOpen(false);
        setErrorMessage(null);
      }
    };

    const handleConfirm = async () => {
      try {
        setIsDeleting(true);
        setErrorMessage(null);
        
        await deleteDataset(datasetId);
        
        // Close dialog first before showing toast and refreshing
        setIsOpen(false);
        
        toast({
          title: "Dataset deleted",
          description: `${datasetName} was successfully deleted.`,
        });
        
        // Slight delay before refreshing to ensure UI state is updated properly
        setTimeout(() => {
          if (onRefresh) onRefresh();
        }, 100);
      } catch (error) {
        console.error("Error deleting dataset:", error);
        setErrorMessage(
          error instanceof Error 
            ? error.message 
            : "An unexpected error occurred while deleting the dataset."
        );
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <DatasetDeleteDialog
        datasetName={datasetName}
        isOpen={isOpen}
        isDeleting={isDeleting}
        errorMessage={errorMessage}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    );
  }
);

DatasetDeletion.displayName = "DatasetDeletion";

export default DatasetDeletion;
