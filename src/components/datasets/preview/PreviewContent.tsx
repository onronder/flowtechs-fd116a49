
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import TableView from "./TableView";

interface PreviewContentProps {
  previewData: any;
  onExport: (format: 'json' | 'csv' | 'xlsx') => void;
  isExporting?: boolean;
}

export default function PreviewContent({ 
  previewData, 
  onExport, 
  isExporting = false 
}: PreviewContentProps) {
  // Calculate execution time nicely formatted
  const formatExecutionTime = () => {
    if (!previewData?.execution?.executionTimeMs) return 'Unknown';
    
    const ms = previewData.execution.executionTimeMs;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  return (
    <div className="flex-1 flex flex-col min-h-0 p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Showing {previewData?.preview?.length || 0} of {previewData?.totalCount || 0} rows
          </p>
          <p className="text-xs text-muted-foreground">
            Execution time: {formatExecutionTime()}
            {previewData?.execution?.apiCallCount && 
              ` • API calls: ${previewData.execution.apiCallCount}`}
          </p>
        </div>
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
  );
}
