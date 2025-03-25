
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Save, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportDataset, ExportFormat, ExportOptions } from "@/api/datasets/exportApi";
import { useToast } from "@/hooks/use-toast";

interface DataExportProps {
  executionId: string;
  datasetName?: string;
  data?: any[];
  showSaveOption?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  className?: string;
}

export default function DataExport({
  executionId,
  datasetName = "dataset",
  data,
  showSaveOption = false,
  onExportStart,
  onExportComplete,
  className,
}: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: ExportFormat, saveToStorage: boolean = false) => {
    if (!executionId) {
      toast({
        title: "Export Failed",
        description: "No execution ID provided",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      
      if (onExportStart) {
        onExportStart();
      }

      // Generate a default file name using the dataset name and timestamp
      const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
      const sanitizedName = (datasetName || "dataset").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `${sanitizedName}_${timestamp}.${format}`;

      console.log(`Exporting dataset ${executionId} as ${format}, saveToStorage=${saveToStorage}`);

      const exportOptions: ExportOptions = {
        executionId,
        format,
        fileName,
        saveToStorage,
        dataSource: data,
      };

      const result = await exportDataset(exportOptions);
      console.log("Export result:", result);

      if (result.success) {
        if (saveToStorage) {
          toast({
            title: "Export Saved",
            description: `The ${format.toUpperCase()} export has been saved to your storage.`,
          });
        } else if (result.downloadUrl) {
          // Direct download if URL is provided
          const a = document.createElement("a");
          a.href = result.downloadUrl;
          a.download = result.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          toast({
            title: "Export Complete",
            description: `The ${format.toUpperCase()} export has been downloaded.`,
          });
        } else if (result.data) {
          // Create and trigger download from data
          const blob = new Blob([result.data], { type: result.fileType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: "Export Complete",
            description: `The ${format.toUpperCase()} export has been downloaded.`,
          });
        }
      } else {
        throw new Error(result.error || "Export failed");
      }

      if (onExportComplete) {
        onExportComplete();
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : `Failed to export to ${format}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isExporting || !executionId}
            id="export-dataset-button"
            name="export-dataset-button"
            title="Export Dataset"
          >
            <Download className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport("json")} id="export-json">
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("csv")} id="export-csv">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("xlsx")} id="export-xlsx">
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </DropdownMenuItem>

          {showSaveOption && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("json", true)} id="save-json">
                <Save className="h-4 w-4 mr-2" />
                Save as JSON to Storage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv", true)} id="save-csv">
                <Save className="h-4 w-4 mr-2" />
                Save as CSV to Storage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx", true)} id="save-xlsx">
                <Save className="h-4 w-4 mr-2" />
                Save as Excel to Storage
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
