
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle, Loader2 } from "lucide-react";
import { getDatasetExecutionData } from "@/api/datasets/execution/getExecutionDataApi";
import JsonPreview from "./JsonPreview";

interface DatasetPreviewProps {
  executionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DatasetPreview({ executionId, isOpen, onClose }: DatasetPreviewProps) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when modal is opened with a new execution ID
  useEffect(() => {
    if (isOpen && executionId) {
      setLoading(true);
      setData(null);
      setError(null);
      
      // Fetch the execution data
      getDatasetExecutionData(executionId)
        .then(result => {
          setData(result.data);
          setStatus(result.status);
          setRowCount(result.rowCount || 0);
          setExecutionTime(result.executionTime || 0);
          setError(result.errorMessage || null);
        })
        .catch(err => {
          setError(err.message || "Failed to load execution data");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [executionId, isOpen]);

  // Poll for updates if status is pending or running
  useEffect(() => {
    if (!isOpen || !executionId || status === "completed" || status === "failed") {
      return;
    }
    
    const intervalId = setInterval(() => {
      getDatasetExecutionData(executionId)
        .then(result => {
          setData(result.data);
          setStatus(result.status);
          setRowCount(result.rowCount || 0);
          setExecutionTime(result.executionTime || 0);
          setError(result.errorMessage || null);
          
          // Stop polling when execution is complete
          if (result.status === "completed" || result.status === "failed") {
            clearInterval(intervalId);
          }
        })
        .catch(err => {
          setError(err.message);
          clearInterval(intervalId);
        });
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(intervalId);
  }, [executionId, isOpen, status]);

  if (!isOpen) {
    return null;
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading dataset execution results...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Execution Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (status === "pending" || status === "running") {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Dataset execution in progress...</p>
        </div>
      );
    }

    if (!data) {
      return (
        <Alert className="my-4">
          <Info className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            This execution did not return any data.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Tabs defaultValue="json">
        <TabsList>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="table" disabled>Table (Coming Soon)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="json" className="mt-4">
          <JsonPreview data={data} />
        </TabsContent>
        
        <TabsContent value="table">
          <div className="py-12 text-center text-muted-foreground">
            Table preview coming soon...
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Dataset Preview</DialogTitle>
          <DialogDescription>
            {status === "completed" && (
              <div className="flex text-sm gap-x-6 mt-1">
                <div>Status: <span className="font-medium text-green-600">Completed</span></div>
                <div>Rows: <span className="font-medium">{rowCount || 0}</span></div>
                {executionTime && (
                  <div>Execution Time: <span className="font-medium">{(executionTime / 1000).toFixed(2)}s</span></div>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
