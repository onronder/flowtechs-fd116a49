import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileJson, FileText, FileSpreadsheet, Download, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportDataset } from "@/api/datasets/exportApi";

interface DataExportProps {
  executionId?: string;
  datasetName: string;
  data?: any[];
  showSaveOption?: boolean;
  onExportStart?: () => void;
  className?: string;
}

export default function DataExport({
  executionId,
  datasetName,
  data,
  showSaveOption = false,
  onExportStart,
  className
}: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const handleExport = async (format: 'json' | 'csv' | 'xlsx', saveToStorage = false) => {
    if (!executionId && !data) {
      toast({
        title: "Export Failed",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      if (onExportStart) {
        onExportStart();
      }
      
      console.log(`Exporting dataset ${executionId} as ${format}, saveToStorage=${saveToStorage}`);
      
      const result = await exportDataset({
        executionId,
        format,
        dataSource: data,
        saveToStorage
      });
      
      if (!result.success) {
        throw new Error(result.error || `Error exporting to ${format}`);
      }
      
      if (saveToStorage) {
        toast({
          title: "Export Successful",
          description: `File saved to your storage: ${result.fileName}`,
        });
      } else if (result.data) {
        // For direct download (not storage)
        const blob = new Blob([result.data], { type: result.fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Export Successful",
          description: `Downloaded ${result.fileName}`,
        });
      } else if (result.downloadUrl) {
        // Handle case where we get a download URL
        window.open(result.downloadUrl, '_blank');
        
        toast({
          title: "Export Successful",
          description: "File ready for download",
        });
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          disabled={isExporting}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="sr-only">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleExport('json')} disabled={isExporting}>
            <FileJson className="mr-2 h-4 w-4" />
            <span>JSON</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
            <FileText className="mr-2 h-4 w-4" />
            <span>CSV</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('xlsx')} disabled={isExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <span>Excel</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        {showSaveOption && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Save to Storage</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => handleExport('json', true)} disabled={isExporting}>
                <Save className="mr-2 h-4 w-4" />
                <span>Save as JSON</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv', true)} disabled={isExporting}>
                <Save className="mr-2 h-4 w-4" />
                <span>Save as CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx', true)} disabled={isExporting}>
                <Save className="mr-2 h-4 w-4" />
                <span>Save as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
