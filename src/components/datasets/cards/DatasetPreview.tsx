
import { useEffect, useState } from "react";
import DatasetPreviewModal from "../DatasetPreviewModal";
import { useDatasetPreview } from "@/hooks/useDatasetPreview";
import PreviewLoading from "../preview/PreviewLoading";
import PreviewInProgress from "../preview/PreviewInProgress";
import PreviewStuckExecution from "../preview/PreviewStuckExecution";
import PreviewContent from "../preview/PreviewContent";
import PreviewError from "../preview/PreviewError";
import PreviewFailed from "../preview/PreviewFailed";
import PreviewHeader from "../preview/PreviewHeader";

interface DatasetPreviewProps {
  executionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DatasetPreview({ executionId, isOpen, onClose }: DatasetPreviewProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const {
    previewData,
    loading,
    error,
    loadPreview,
    dataSource,
    pollCount,
    maxPollCount,
    startTime,
    shouldShowStuckUi,
    checkForStuckExecution
  } = useDatasetPreview(executionId, isOpen);
  
  // Ensure we reload preview data when the execution ID changes
  useEffect(() => {
    if (isOpen && executionId) {
      loadPreview();
    }
  }, [executionId, isOpen, loadPreview]);
  
  const handleExport = (format: 'json' | 'csv' | 'xlsx') => {
    setIsExporting(true);
    // TODO: Implement export functionality
    setTimeout(() => setIsExporting(false), 1000);
  };
  
  // Render the appropriate content based on the current state
  const renderContent = () => {
    // Show error state if there's an error
    if (error) {
      return <PreviewError error={error} onRetry={() => loadPreview()} />;
    }
    
    // Show loading state while initially loading
    if (loading && !previewData) {
      return <PreviewLoading />;
    }
    
    // If the user interface for stuck executions should be shown
    if (shouldShowStuckUi && previewData?.execution?.startTime) {
      return (
        <PreviewStuckExecution
          executionId={executionId!}
          startTime={previewData.execution.startTime}
          onRetry={checkForStuckExecution}
        />
      );
    }
    
    // If execution is in progress (pending or running)
    if (previewData && ['pending', 'running'].includes(previewData.status)) {
      return (
        <PreviewInProgress 
          pollCount={pollCount} 
          maxPollCount={maxPollCount}
          startTime={startTime}
        />
      );
    }
    
    // If execution failed
    if (previewData && previewData.status === 'failed') {
      return (
        <PreviewFailed 
          errorMessage={previewData.error} 
          onClose={onClose} 
          onRetry={() => loadPreview()}
        />
      );
    }
    
    // Default to showing the preview content
    return (
      <PreviewContent
        previewData={previewData}
        onExport={handleExport}
        isExporting={isExporting}
        dataSource={dataSource}
      />
    );
  };
  
  return (
    <DatasetPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title={previewData?.dataset?.name || "Dataset Preview"}
      description={previewData?.dataset?.type || ""}
    >
      <div className="flex flex-col h-[calc(90vh-7rem)]">
        <PreviewHeader
          datasetName={previewData?.dataset?.name || "Loading..."}
          executionId={executionId}
          isRefreshing={loading && !!previewData}
          onRefresh={() => loadPreview()}
        />
        {renderContent()}
      </div>
    </DatasetPreviewModal>
  );
}
