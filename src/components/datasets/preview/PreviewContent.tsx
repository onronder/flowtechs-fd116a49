
import { Button } from "@/components/ui/button";
import TableView from "./TableView";

interface PreviewContentProps {
  previewData: any;
  onExport: (format: string) => void;
}

export default function PreviewContent({ previewData, onExport }: PreviewContentProps) {
  return (
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
            onClick={() => onExport('json')}
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('csv')}
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
  );
}
