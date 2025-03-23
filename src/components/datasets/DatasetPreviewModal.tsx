
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDatasetPreview } from "@/hooks/useDatasetPreview";
import { exportDataset } from "@/api/datasets/execution/index";
import { useToast } from "@/hooks/use-toast";
import PreviewHeader from "./preview/PreviewHeader";
import PreviewLoading from "./preview/PreviewLoading";
import PreviewError from "./preview/PreviewError";
import PreviewInProgress from "./preview/PreviewInProgress";
import PreviewFailed from "./preview/PreviewFailed";
import PreviewContent from "./preview/PreviewContent";

export default function DatasetPreviewModal({ executionId, isOpen, onClose }) {
  const { toast } = useToast();
  const { 
    previewData, 
    loading, 
    error, 
    loadPreview, 
    pollCount, 
    maxPollCount 
  } = useDatasetPreview(executionId, isOpen);

  async function handleExport(format) {
    try {
      // Simple implementation - you can expand this later
      const result = await exportDataset(executionId, { format });
      
      if (result.data) {
        // For direct download
        const blob = new Blob(
          [result.data],
          { type: format === 'json' ? 'application/json' : 'text/csv' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || `dataset_export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: `The dataset has been exported as ${format.toUpperCase()}.`
        });
      }
    } catch (error) {
      console.error("Error exporting dataset:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export the dataset.",
        variant: "destructive"
      });
    }
  }

  const renderContent = () => {
    if (loading) {
      return <PreviewLoading />;
    }
    
    if (error) {
      return <PreviewError error={error} onRetry={() => loadPreview()} onClose={onClose} />;
    }
    
    if (previewData?.status === "running" || previewData?.status === "pending") {
      return <PreviewInProgress pollCount={pollCount} maxPollCount={maxPollCount} />;
    }
    
    if (previewData?.status === "failed") {
      return <PreviewFailed errorMessage={previewData.error} onClose={onClose} />;
    }
    
    return <PreviewContent previewData={previewData} onExport={handleExport} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] flex flex-col"
        aria-describedby="dataset-preview-description"
      >
        <div id="dataset-preview-description" className="sr-only">
          Dataset preview showing execution results and data visualization
        </div>
        <PreviewHeader title={previewData?.dataset?.name || "Dataset Preview"} />
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
