
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PreviewHeader from "./preview/PreviewHeader";
import { ReactNode } from "react";

interface DatasetPreviewModalProps {
  executionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  datasetType?: string;
  templateName?: string;
  children: ReactNode;
}

export default function DatasetPreviewModal({ 
  executionId, 
  isOpen, 
  onClose,
  title,
  datasetType,
  templateName,
  children
}: DatasetPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        aria-describedby="dataset-preview-description"
      >
        <div id="dataset-preview-description" className="sr-only">
          Dataset preview showing execution results and data visualization
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
