
import { useEffect, useState, useCallback } from "react";
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
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  
  // Update current execution ID when props change
  useEffect(() => {
    if (isOpen && executionId && executionId !== currentExecutionId) {
      setCurrentExecutionId(executionId);
    }
  }, [executionId, isOpen, currentExecutionId]);
  
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
  } = useDatasetPreview(currentExecutionId, isOpen);
  
  // Clean up when component unmounts or modal closes
  useEffect(() => {
    if (!isOpen) {
      // Don't reset currentExecutionId to allow caching between opens
    }
    
    return () => {
      if (!isOpen) {
        console.log("[DatasetPreview] Cleanup on modal close");
      }
    };
  }, [isOpen]);
  
  const handleExport = (format: 'json' | 'csv' | 'xlsx') => {
    setIsExporting(true);
    // TODO: Implement export functionality
    setTimeout(() => setIsExporting(false), 1000);
  };
  
  const handleCloseModal = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // Render the appropriate content based on the current state
  const renderContent = () => {
    // Log current state for debugging
    console.log(`[DatasetPreview] Rendering content with state: loading=${loading}, error=${error ? 'yes' : 'no'}, ` +
                `previewData=${previewData ? `status:${previewData.status}` : 'null'}, ` +
                `shouldShowStuckUi=${shouldShowStuckUi}, isPolling=${isPolling}`);
    
    // Show error state if there's an error
    if (error) {
      return <PreviewError error={error} onRetry={() => loadPreview()} onClose={handleCloseModal} />;
    }
    
    // Show loading state while initially loading
    if (loading && !previewData) {
      return <PreviewLoading message="Loading dataset results..." />;
    }
    
    // If the user interface for stuck executions should be shown
    if (shouldShowStuckUi && previewData?.execution?.startTime) {
      return (
        <PreviewStuckExecution
          executionId={currentExecutionId!}
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
          onClose={handleCloseModal} 
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
      onClose={handleCloseModal}
      executionId={currentExecutionId}
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
