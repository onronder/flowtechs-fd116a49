
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
import { exportDataset, ExportFormat } from "@/api/datasets/exportApi";
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

      await exportDataset({
        executionId,
        format,
        fileName,
        saveToStorage,
        dataSource: data,
      });

      if (saveToStorage) {
        toast({
          title: "Export Saved",
          description: `The ${format.toUpperCase()} export has been saved to your storage.`,
        });
      } else {
        toast({
          title: "Export Complete",
          description: `The ${format.toUpperCase()} export has been downloaded.`,
        });
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
            variant="outline"
            size="sm"
            disabled={isExporting || !executionId}
            id="export-dataset-button"
            name="export-dataset-button"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport("json")} id="export-json">
            <Download className="h-4 w-4 mr-2" />
            JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("csv")} id="export-csv">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("xlsx")} id="export-xlsx">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </DropdownMenuItem>

          {showSaveOption && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("json", true)} id="save-json">
                <Save className="h-4 w-4 mr-2" />
                Save as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv", true)} id="save-csv">
                <Save className="h-4 w-4 mr-2" />
                Save as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx", true)} id="save-xlsx">
                <Save className="h-4 w-4 mr-2" />
                Save as Excel
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
