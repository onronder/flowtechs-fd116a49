
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchDatasetPreview, exportDataset } from "@/api/datasetsApi";
import { useToast } from "@/hooks/use-toast";
import TableView from "./preview/TableView";

export default function DatasetPreviewModal({ executionId, isOpen, onClose }) {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && executionId) {
      loadPreview();
      
      // Set up polling if the execution is still running
      const interval = setInterval(() => {
        loadPreview(false); // Don't show loading indicator for polling
      }, 3000);
      
      setPollingInterval(interval);
      
      return () => {
        if (pollingInterval) clearInterval(pollingInterval);
      };
    }
  }, [isOpen, executionId]);

  async function loadPreview(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
      
      const data = await fetchDatasetPreview(executionId);
      setPreviewData(data);
      
      // If execution is complete, stop polling
      if (data.status === "completed" || data.status === "failed") {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err) {
      console.error("Error loading preview:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load dataset preview";
      setError(errorMessage);
      
      // Stop polling on error
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      toast({
        title: "Error",
        description: "Failed to load dataset preview.",
        variant: "destructive"
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }

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
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
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
              <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Execution in Progress</h3>
              <p className="text-muted-foreground">
                The dataset is still being executed. This preview will update automatically.
              </p>
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
