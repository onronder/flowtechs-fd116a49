
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileJson, FileText, FileSpreadsheet, Download, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportDataset, ExportFormat, ExportOptions } from "@/api/datasets/exportApi";
import { toast } from "@/hooks/use-toast";

export interface DataExportProps {
  executionId: string;
  datasetName?: string;
  data?: any[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showSaveOption?: boolean;
  onExportStart?: () => void;
  onExportComplete?: (format: ExportFormat, fileName: string) => void;
  className?: string;
}

export default function DataExport({
  executionId,
  datasetName,
  data,
  variant = "outline",
  size = "sm",
  showSaveOption = false,
  onExportStart,
  onExportComplete,
  className
}: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  
  const handleExport = async (format: ExportFormat, saveToStorage: boolean = false) => {
    try {
      if (!executionId && !data) {
        toast({
          title: "Export Error",
          description: "No data available to export",
          variant: "destructive"
        });
        return;
      }
      
      setIsExporting(true);
      setExportFormat(format);
      
      if (onExportStart) {
        onExportStart();
      }
      
      const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
      const sanitizedName = (datasetName || "dataset").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const fileName = `${sanitizedName}_${timestamp}.${format}`;
      
      const options: ExportOptions = {
        executionId,
        format,
        fileName,
        saveToStorage,
        dataSource: data
      };
      
      const result = await exportDataset(options);
      
      if (onExportComplete) {
        onExportComplete(format, result.fileName);
      }
      
      if (saveToStorage) {
        toast({
          title: "Export Saved",
          description: `Your data has been exported and saved to your storage`,
        });
      } else {
        toast({
          title: "Export Complete",
          description: `Your data has been exported to ${format.toUpperCase()}`,
        });
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      toast({
        title: "Export Failed",
        description: error.message || `Failed to export data to ${format.toUpperCase()}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };
  
  const getButtonContent = (format: ExportFormat) => {
    const isCurrentlyExporting = isExporting && exportFormat === format;
    const label = format.toUpperCase();
    
    let icon;
    switch (format) {
      case 'json':
        icon = <FileJson className="h-4 w-4 mr-2" />;
        break;
      case 'csv':
        icon = <FileText className="h-4 w-4 mr-2" />;
        break;
      case 'xlsx':
        icon = <FileSpreadsheet className="h-4 w-4 mr-2" />;
        break;
    }
    
    return (
      <>
        {icon}
        {isCurrentlyExporting ? `Exporting...` : label}
      </>
    );
  };
  
  return (
    <div className={`flex space-x-2 ${className || ''}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={() => handleExport('json')}
              disabled={isExporting}
              aria-label="Export as JSON"
              data-testid="export-json"
              id="export-json-button"
              name="export-json-button"
            >
              {getButtonContent('json')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export as JSON</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              aria-label="Export as CSV"
              data-testid="export-csv"
              id="export-csv-button"
              name="export-csv-button"
            >
              {getButtonContent('csv')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export as CSV</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              aria-label="Export as Excel"
              data-testid="export-excel"
              id="export-excel-button"
              name="export-excel-button"
            >
              {getButtonContent('xlsx')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export as Excel</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showSaveOption && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={variant}
                size={size}
                onClick={() => handleExport('json', true)}
                disabled={isExporting}
                aria-label="Save to storage"
                data-testid="save-storage"
                id="save-storage-button"
                name="save-storage-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {isExporting && exportFormat === 'json' && saveToStorage ? 'Saving...' : 'Save'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save to your storage</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
