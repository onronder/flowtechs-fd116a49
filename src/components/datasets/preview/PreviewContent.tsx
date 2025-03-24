
import { Button } from "@/components/ui/button";
import { Download, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TableView from "./TableView";
import { DataSourceType } from "@/hooks/usePreviewDataLoader";

interface PreviewContentProps {
  previewData: any;
  onExport: (format: 'json' | 'csv' | 'xlsx') => void;
  isExporting: boolean;
  dataSource: DataSourceType;
}

export default function PreviewContent({ 
  previewData, 
  onExport, 
  isExporting,
  dataSource 
}: PreviewContentProps) {
  // Calculate rows data for summary
  const totalRows = previewData?.totalCount || 0;
  const previewRows = previewData?.preview?.length || 0;
  const hasMoreRows = totalRows > previewRows;
  
  const executionTime = previewData?.execution?.executionTimeMs 
    ? `${(previewData.execution.executionTimeMs / 1000).toFixed(2)}s` 
    : 'N/A';
    
  const apiCalls = previewData?.execution?.apiCallCount !== undefined
    ? previewData.execution.apiCallCount
    : 'N/A';
    
  const showNoDataMessage = 
    (!previewData?.preview || previewData.preview.length === 0) && 
    previewData?.status === 'completed';
    
  const showEmptyResults = previewData?.status === 'completed' && 
    totalRows === 0 && (!previewData?.error || previewData.error === '');
    
  const columns = previewData?.columns || [];

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <div className="bg-muted/20 px-6 py-3 border-y flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm text-muted-foreground mr-2">Status:</span>
            <Badge variant={previewData?.status === 'completed' ? 'success' : previewData?.status === 'failed' ? 'destructive' : 'default'}>
              {previewData?.status || 'unknown'}
            </Badge>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground mr-2">Rows:</span>
            <span className="text-sm font-medium">
              {totalRows > 0 
                ? `${totalRows.toLocaleString()} ${hasMoreRows 
                    ? `(${previewRows} displayed)` 
                    : ''}`
                : '0'
              }
            </span>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground mr-2">Time:</span>
            <span className="text-sm font-medium">{executionTime}</span>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground mr-2">API Calls:</span>
            <span className="text-sm font-medium">{apiCalls}</span>
          </div>
          
          {dataSource !== 'preview' && (
            <Badge variant="outline" className="bg-blue-50">
              {dataSource === 'direct' ? 'Database View' : 'Basic View'}
            </Badge>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('csv')}
            disabled={isExporting || previewData?.status !== 'completed' || totalRows === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {showNoDataMessage ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <File className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Data Available</h3>
            <p className="text-muted-foreground max-w-md">
              This dataset execution returned zero results. Try adjusting your query parameters or check if the source contains the data you're looking for.
            </p>
          </div>
        ) : showEmptyResults ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <File className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-2">Query Returned Empty Results</h3>
            <p className="text-muted-foreground max-w-md">
              The query completed successfully but returned no data.
            </p>
          </div>
        ) : previewData?.preview && previewData.preview.length > 0 ? (
          <TableView columns={columns} data={previewData.preview} />
        ) : (
          <div className="p-4">
            {dataSource === 'minimal' ? (
              <div className="p-4 border rounded text-center">
                <p className="text-amber-600">Limited dataset information available.</p>
                <p className="text-sm text-muted-foreground mt-2">Full preview data could not be loaded.</p>
              </div>
            ) : (
              <div className="p-4 border rounded text-center">
                <p className="text-muted-foreground">Preview data is loading or not available.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
