
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDatasetPreview } from "@/hooks/useDatasetPreview";
import { exportDataset } from "@/api/datasets/execution/index";
import { useToast } from "@/hooks/use-toast";
import { ExportOptions } from "@/api/datasets/datasetsApiTypes";
import PreviewHeader from "./preview/PreviewHeader";
import PreviewLoading from "./preview/PreviewLoading";
import PreviewError from "./preview/PreviewError";
import PreviewInProgress from "./preview/PreviewInProgress";
import PreviewFailed from "./preview/PreviewFailed";
import PreviewContent from "./preview/PreviewContent";
import PreviewStuckExecution from "./preview/PreviewStuckExecution";
import { DataSourceType } from "@/hooks/usePreviewDataLoader";

interface DatasetPreviewModalProps {
  executionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DatasetPreviewModal({ 
  executionId, 
  isOpen, 
  onClose 
}: DatasetPreviewModalProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  const { 
    previewData, 
    loading, 
    error, 
    loadPreview, 
    dataSource,
    pollCount, 
    maxPollCount,
    startTime 
  } = useDatasetPreview(executionId, isOpen);

  async function handleExport(format: 'json' | 'csv' | 'xlsx') {
    try {
      setIsExporting(true);
      toast({
        title: "Starting Export",
        description: `Preparing ${format.toUpperCase()} export...`
      });
      
      // Simple implementation - you can expand this later
      const result = await exportDataset(executionId, { format } as ExportOptions);
      
      if (result?.data) {
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
        description: error instanceof Error ? error.message : "Failed to export dataset",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }

  // Check if execution is potentially stuck
  const isPotentiallyStuck = () => {
    if (!previewData || !previewData.execution?.startTime) return false;
    
    // If it's been in pending/running state for more than 5 minutes, consider it potentially stuck
    const startTimeMs = new Date(previewData.execution.startTime).getTime();
    const currentTime = new Date().getTime();
    const fiveMinutesMs = 5 * 60 * 1000;
    
    return (
      (previewData.status === "pending" || previewData.status === "running") && 
      (currentTime - startTimeMs > fiveMinutesMs)
    );
  };

  const renderContent = () => {
    if (loading) {
      return <PreviewLoading />;
    }
    
    if (error) {
      // Enhanced error handling with retry capability
      return (
        <PreviewError 
          error={error} 
          onRetry={() => loadPreview(true)} 
          onClose={onClose} 
        />
      );
    }
    
    if (isPotentiallyStuck() && previewData?.execution?.startTime) {
      return (
        <PreviewStuckExecution
          executionId={executionId}
          startTime={previewData.execution.startTime}
          onRetry={() => loadPreview(true)}
        />
      );
    }
    
    if (previewData?.status === "running" || previewData?.status === "pending") {
      return (
        <PreviewInProgress 
          pollCount={pollCount} 
          maxPollCount={maxPollCount} 
          startTime={startTime}
        />
      );
    }
    
    if (previewData?.status === "failed") {
      return (
        <PreviewFailed 
          errorMessage={previewData.error} 
          onClose={onClose} 
          onRetry={() => loadPreview(true)}
        />
      );
    }
    
    return (
      <PreviewContent 
        previewData={previewData} 
        onExport={handleExport} 
        isExporting={isExporting}
        dataSource={dataSource as DataSourceType}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        aria-describedby="dataset-preview-description"
      >
        <div id="dataset-preview-description" className="sr-only">
          Dataset preview showing execution results and data visualization
        </div>
        <PreviewHeader 
          title={previewData?.dataset?.name || "Dataset Preview"} 
          datasetType={previewData?.dataset?.type}
          templateName={previewData?.dataset?.template?.name}
        />
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
