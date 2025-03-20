
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchDatasetPreview, exportDataset } from "@/api/datasets/execution/index";
import { useToast } from "@/hooks/use-toast";
import TableView from "./preview/TableView";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function DatasetPreviewModal({ executionId, isOpen, onClose }) {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const pollingIntervalRef = useRef(null);
  const MAX_POLL_COUNT = 20; // Maximum number of polling attempts
  const pollCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Cleanup function
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadPreview = useCallback(async (showLoading = true) => {
    try {
      if (!mountedRef.current) return;
      
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      console.log("Fetching preview data for execution ID:", executionId);
      const data = await fetchDatasetPreview(executionId);
      console.log("Preview data received:", data);
      
      if (!mountedRef.current) return;
      setPreviewData(data);
      
      // If execution is complete or failed, stop polling
      if (data.status === "completed" || data.status === "failed") {
        console.log("Execution complete, stopping polling");
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error("Error loading preview:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
      setError(errorMessage);
      
      // Stop polling on error
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      toast({
        title: "Error",
        description: "Failed to load dataset preview.",
        variant: "destructive"
      });
    } finally {
      if (showLoading && mountedRef.current) setLoading(false);
    }
  }, [executionId, toast]);

  useEffect(() => {
    if (isOpen && executionId) {
      // Reset state when opening with a new execution ID
      setLoading(true);
      setError(null);
      setPreviewData(null);
      pollCountRef.current = 0;
      
      // Initial load
      loadPreview();
      
      // Set up polling
      pollingIntervalRef.current = setInterval(() => {
        if (pollCountRef.current >= MAX_POLL_COUNT) {
          console.log("Max polling attempts reached, stopping polling");
          clearInterval(pollingIntervalRef.current);
          
          // Show a timeout error if we still don't have data
          if (!previewData || previewData.status === "running" || previewData.status === "pending") {
            setError("Execution is taking longer than expected. Please check back later.");
          }
          return;
        }
        
        pollCountRef.current++;
        console.log(`Polling attempt ${pollCountRef.current}/${MAX_POLL_COUNT}`);
        loadPreview(false); // Don't show loading indicator for polling
      }, 2000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [isOpen, executionId, previewData, loadPreview]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] flex flex-col"
        aria-describedby="dataset-preview-description"
      >
        <DialogHeader>
          <DialogTitle>
            {previewData?.dataset?.name || "Dataset Preview"}
          </DialogTitle>
          <DialogDescription id="dataset-preview-description">
            Preview data and results from dataset execution
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <div className="ml-4">Loading dataset results...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 p-4 rounded-md mb-4">
                <h3 className="text-lg font-medium mb-2">Error Loading Preview</h3>
                <p>{error}</p>
              </div>
              <Button variant="outline" onClick={() => loadPreview()}>Try Again</Button>
              <Button variant="outline" className="ml-2" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : previewData?.status === "running" || previewData?.status === "pending" ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Execution in Progress</h3>
              <p className="text-muted-foreground mb-2">
                The dataset is still being executed. This preview will update automatically.
              </p>
              <div className="text-sm text-muted-foreground">
                Polling attempt: {pollCountRef.current}/{MAX_POLL_COUNT}
              </div>
            </div>
          </div>
        ) : previewData?.status === "failed" ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 p-4 rounded-md mb-4">
                <h3 className="text-lg font-medium mb-2">Execution Failed</h3>
                <p>{previewData.error || "An unknown error occurred during execution."}</p>
              </div>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing {previewData?.preview?.length || 0} of {previewData?.totalCount || 0} rows
                </p>
                <p className="text-xs text-muted-foreground">
                  Execution time: {previewData?.execution?.executionTimeMs ? 
                    `${(previewData.execution.executionTimeMs / 1000).toFixed(2)}s` : 'Unknown'}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                >
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                >
                  Export CSV
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto border rounded-md">
              {previewData?.preview && previewData.preview.length > 0 ? (
                <TableView data={previewData.preview} columns={previewData.columns} />
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <p className="text-muted-foreground">No data available in this dataset.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
