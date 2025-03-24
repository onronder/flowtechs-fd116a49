
import { supabase } from "@/integrations/supabase/client";

// Define clear types to avoid circular references
export interface ExportOptions {
  executionId: string;
  format?: 'json' | 'csv' | 'xlsx';
  fileName?: string;
  dataSource?: any[];
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl?: string;
  data?: string;
  error?: string;
}

/**
 * Export dataset results to a specific format
 */
export async function exportDataset(options: ExportOptions): Promise<ExportResult> {
  const { executionId, format = 'json', fileName, dataSource } = options;
  
  try {
    // Prepare request payload
    const requestBody: Record<string, any> = {
      executionId,
      format
    };
    
    // Add optional parameters if provided
    if (fileName) {
      requestBody.fileName = fileName;
    }
    
    if (dataSource) {
      requestBody.dataSource = dataSource;
    }
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('DataExport', {
      body: JSON.stringify(requestBody)
    });
    
    if (error) throw error;
    
    return data as ExportResult;
  } catch (error) {
    console.error('Error exporting dataset:', error);
    return {
      success: false,
      fileName: '',
      fileType: '',
      fileSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error exporting dataset'
    };
  }
}

/**
 * Get list of exported files for a dataset execution
 */
export async function getDatasetExports(executionId: string) {
  try {
    const { data, error } = await supabase
      .from('user_storage_exports')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      success: true,
      exports: data
    };
  } catch (error) {
    console.error('Error fetching dataset exports:', error);
    return {
      success: false,
      exports: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching exports'
    };
  }
}
