
import { useEffect, useState } from "react";
import DatasetPreviewModal from "../DatasetPreviewModal";
import { useDatasetPreview } from "@/hooks/preview/useDatasetPreview";
import PreviewLoading from "../preview/PreviewLoading";
import PreviewInProgress from "../preview/PreviewInProgress";
import PreviewStuckExecution from "../preview/PreviewStuckExecution";
import PreviewContent from "../preview/PreviewContent";
import PreviewError from "../preview/PreviewError";
import PreviewHeader from "../preview/PreviewHeader";
import PreviewFailed from "../preview/PreviewFailed";

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
    checkForStuckExecution,
    isPolling
  } = useDatasetPreview(executionId, isOpen);
  
  // Ensure we reload preview data when the execution ID changes or modal opens
  useEffect(() => {
    if (isOpen && executionId) {
      console.log(`[DatasetPreview] Modal opened with executionId: ${executionId}, loading preview data`);
      loadPreview(true, false);
    }
  }, [executionId, isOpen, loadPreview]);
  
  // Clean up when component unmounts or modal closes
  useEffect(() => {
    return () => {
      console.log("[DatasetPreview] Component cleanup on unmount or modal close");
    };
  }, [isOpen]);
  
  const handleExport = (format: 'json' | 'csv' | 'xlsx') => {
    setIsExporting(true);
    // TODO: Implement export functionality
    setTimeout(() => setIsExporting(false), 1000);
  };
  
  // Render the appropriate content based on the current state
  const renderContent = () => {
    // Log current state for debugging
    console.log(`[DatasetPreview] Rendering content with state: loading=${loading}, error=${error ? 'yes' : 'no'}, ` +
                `previewData=${previewData ? `status:${previewData.status}` : 'null'}, ` +
                `shouldShowStuckUi=${shouldShowStuckUi}, isPolling=${isPolling}`);
    
    // Show error state if there's an error
    if (error) {
      return <PreviewError error={error} onRetry={() => loadPreview()} onClose={onClose} />;
    }
    
    // Show loading state while initially loading
    if (loading && !previewData) {
      return <PreviewLoading message="Loading dataset results..." />;
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
    
    // Default to showing the preview content (for completed executions)
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
      executionId={executionId}
      title={previewData?.dataset?.name || "Dataset Preview"}
      datasetType={previewData?.dataset?.type}
      templateName={previewData?.dataset?.template?.name}
    >
      <div className="flex flex-col h-[calc(90vh-7rem)]">
        <PreviewHeader
          title={previewData?.dataset?.name || "Loading..."}
          datasetType={previewData?.dataset?.type}
          templateName={previewData?.dataset?.template?.name}
        />
        {renderContent()}
      </div>
    </DatasetPreviewModal>
  );
}
