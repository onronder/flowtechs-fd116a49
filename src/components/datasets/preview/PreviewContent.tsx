
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TableView from "./TableView";

interface PreviewContentProps {
  previewData: any;
  onExport: (format: 'json' | 'csv' | 'xlsx') => void;
  isExporting?: boolean;
  dataSource?: 'preview' | 'direct' | 'minimal';
}

export default function PreviewContent({ 
  previewData, 
  onExport, 
  isExporting = false,
  dataSource = 'preview'
}: PreviewContentProps) {
  // Calculate execution time nicely formatted
  const formatExecutionTime = () => {
    if (!previewData?.execution?.executionTimeMs) return 'Unknown';
    
    const ms = previewData.execution.executionTimeMs;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Check if we have data to display
  const hasData = previewData?.preview && Array.isArray(previewData.preview) && previewData.preview.length > 0;
  
  return (
    <div className="flex-1 flex flex-col min-h-0 p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {hasData 
              ? `Showing ${previewData?.preview?.length || 0} of ${previewData?.totalCount || 0} rows` 
              : "No rows to display"}
          </p>
          <p className="text-xs text-muted-foreground">
            Execution time: {formatExecutionTime()}
            {previewData?.execution?.apiCallCount && 
              ` • API calls: ${previewData.execution.apiCallCount}`}
          </p>
        </div>
        {hasData && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('json')}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Export JSON
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('csv')}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      
      {dataSource !== 'preview' && (
        <Alert className="mb-4" variant={dataSource === 'minimal' ? 'destructive' : 'default'}>
          {dataSource === 'minimal' 
            ? <AlertCircle className="h-4 w-4" />
            : <Info className="h-4 w-4" />}
          <AlertDescription>
            {dataSource === 'minimal' 
              ? 'Using minimal execution data. Preview content is not available.' 
              : 'Using direct database access for preview.'}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex-1 overflow-auto border rounded-md">
        {hasData ? (
          <TableView data={previewData.preview} columns={previewData.columns} />
        ) : (
          <div className="flex items-center justify-center h-full p-8 flex-col">
            <p className="text-muted-foreground mb-2">No data available in this preview.</p>
            {previewData?.status === "running" && (
              <p className="text-sm text-blue-500">Execution is still in progress...</p>
            )}
            {previewData?.totalCount === 0 && previewData?.status === "completed" && (
              <p className="text-sm text-amber-500">Query completed but returned zero rows.</p>
            )}
            {previewData?.error && (
              <p className="text-sm text-red-500 mt-2">Error: {previewData.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
