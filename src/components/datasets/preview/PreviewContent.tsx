
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import TableView from "./TableView";
import { DataSourceType } from "@/hooks/usePreviewDataLoader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PreviewContentProps {
  previewData: any;
  dataSource: DataSourceType;
  onExport: (format: 'json' | 'csv' | 'xlsx') => void;
  isExporting: boolean;
}

export default function PreviewContent({ 
  previewData, 
  dataSource, 
  onExport, 
  isExporting 
}: PreviewContentProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  
  if (!previewData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">No preview data available</p>
      </div>
    );
  }
  
  const preview = previewData.preview || [];
  const columns = previewData.columns || [];
  const totalCount = previewData.totalCount || 0;
  
  // If no data to show
  if (preview.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Data Available</h3>
        <p className="text-muted-foreground text-center max-w-md">
          The dataset execution completed successfully, but no data was returned.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <div>
          <p className="text-sm">
            <span className="font-medium">{totalCount}</span> total rows 
            {preview.length < totalCount && ` (showing first ${preview.length})`}
          </p>
          {dataSource !== 'preview' && (
            <Alert className="mt-2" variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Using fallback data source</AlertTitle>
              <AlertDescription>
                Data is being loaded from a fallback source ({dataSource}). Some features may be limited.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('json')}
            disabled={isExporting}
          >
            <FileJson className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('csv')}
            disabled={isExporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('xlsx')}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
          >
            <Download className="h-4 w-4 mr-2" />
            All Rows
          </Button>
        </div>
      </div>
      
      <div ref={tableRef} className="flex-1 overflow-auto">
        <TableView 
          data={preview} 
          columns={columns} 
        />
      </div>
    </div>
  );
}
