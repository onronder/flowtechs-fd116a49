
import { useState } from "react";
import DatasetPreviewModal from "../DatasetPreviewModal";

interface DatasetPreviewProps {
  executionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DatasetPreview({ 
  executionId, 
  isOpen, 
  onClose 
}: DatasetPreviewProps) {
  if (!isOpen || !executionId) {
    return null;
  }

  return (
    <DatasetPreviewModal
      executionId={executionId}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
