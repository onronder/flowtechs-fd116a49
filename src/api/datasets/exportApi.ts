
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ExportOptions {
  executionId: string;
  format?: ExportFormat;
  fileName?: string;
  saveToStorage?: boolean;
  dataSource?: any[];
}

export interface ExportResponse {
  success: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl?: string;
  data?: string;
}

/**
 * Export dataset to specified format
 */
export async function exportDataset(options: ExportOptions): Promise<ExportResponse> {
  try {
    const { executionId, format = 'json', fileName, saveToStorage = false, dataSource } = options;
    
    console.log(`Exporting dataset for execution ID: ${executionId}, format: ${format}, saveToStorage: ${saveToStorage}`);
    
    const payload = {
      executionId,
      format,
      fileName,
      dataSource
    };
    
    // If saveToStorage is true, we add that info in the header
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (saveToStorage) {
      headers['Save-To-Storage'] = 'true';
    }
    
    const { data, error } = await supabase.functions.invoke(
      "DataExport",
      {
        body: JSON.stringify(payload),
        headers
      }
    );
    
    if (error) {
      console.error("Error exporting dataset:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export dataset",
        variant: "destructive"
      });
      throw error;
    }
    
    console.log("Dataset export response:", data);
    
    if (saveToStorage) {
      toast({
        title: "Export Complete",
        description: `Dataset exported and saved to storage as ${data.fileName}`,
      });
      return data as ExportResponse;
    } else if (data.data) {
      // For direct download, we create a blob and trigger browser download
      const blob = new Blob([data.data], { type: data.fileType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return {
        success: true,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.data.length
      };
    } else if (data instanceof Blob) {
      // Handle case where the response is a Blob
      const url = URL.createObjectURL(data);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `export.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Return simplified response without any recursive structure
      return {
        success: true,
        fileName: fileName || `export.${format}`,
        fileType: data.type,
        fileSize: data.size
      };
    } else {
      // Return data directly with explicit type assertion
      return data as ExportResponse;
    }
  } catch (error) {
    console.error("Error exporting dataset:", error);
    toast({
      title: "Export Failed",
      description: error instanceof Error ? error.message : "Failed to export dataset",
      variant: "destructive"
    });
    throw error;
  }
}

/**
 * Get user's saved exports
 */
export async function getUserExports(datasetId?: string): Promise<any[]> {
  try {
    let query = supabase
      .from("user_storage_exports")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (datasetId) {
      query = query.eq("dataset_id", datasetId);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error("Error fetching user exports:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error fetching user exports:", error);
    throw error;
  }
}

/**
 * Get dataset exports for a specific execution
 */
export async function getDatasetExports(executionId: string): Promise<any[]> {
  try {
    console.log(`Fetching exports for execution ID: ${executionId}`);
    
    const { data, error } = await supabase
      .from("user_storage_exports")
      .select("*")
      .eq("execution_id", executionId)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching exports:", error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} export records`);
    return data || [];
  } catch (error) {
    console.error("Error fetching exports:", error);
    throw error;
  }
}
