import React, { useState, useEffect } from "react";
import { getUserExports } from "@/api/datasets/exportApi";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileJson, FileText, FileSpreadsheet, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { toast } from "@/hooks/use-toast";

const DataStorage = () => {
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadExports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserExports();
      setExports(data);
    } catch (error) {
      setError("Failed to load your exports");
      console.error("Error loading exports:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadExports();
  }, []);
  
  const handleDownload = (fileUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download Started",
      description: `Downloading ${fileName}`,
    });
  };
  
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'json':
        return <FileJson className="h-4 w-4" />;
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Data Storage</h1>
          <p className="text-muted-foreground">Manage your exported datasets</p>
        </div>
        
        <Button variant="outline" onClick={loadExports} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-800 dark:text-red-200">
          <p className="font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadExports}>
            Try Again
          </Button>
        </div>
      ) : exports.length === 0 ? (
        <div className="bg-muted p-8 rounded-lg text-center">
          <h3 className="text-lg font-medium mb-2">No Exports Yet</h3>
          <p className="text-muted-foreground mb-6">
            You haven't exported any datasets yet. Export some data to see it here.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Exported On</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((exportItem) => (
                <TableRow key={exportItem.id}>
                  <TableCell>{getFileIcon(exportItem.file_type)}</TableCell>
                  <TableCell className="font-medium">{exportItem.file_name}</TableCell>
                  <TableCell className="uppercase">{exportItem.file_type}</TableCell>
                  <TableCell>{formatFileSize(exportItem.file_size)}</TableCell>
                  <TableCell>{format(new Date(exportItem.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDownload(exportItem.file_url, exportItem.file_name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DataStorage;
