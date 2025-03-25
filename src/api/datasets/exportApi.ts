
import { supabase } from "@/integrations/supabase/client";

// Define clear types to avoid circular references
export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ExportOptions {
  executionId: string;
  format?: ExportFormat;
  fileName?: string;
  dataSource?: any[];
  saveToStorage?: boolean;
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

// Define a type that matches the user_storage_exports table structure
export interface StorageExport {
  id: string;
  file_path: string;
  created_at: string;
  user_id: string;
  execution_id: string;
  format: string;
  file_size: number;
  file_name: string;
  file_type: string;
  file_url: string;
  dataset_id: string;
}

/**
 * Export dataset results to a specific format
 */
export async function exportDataset(options: ExportOptions): Promise<ExportResult> {
  const { executionId, format = 'json', fileName, dataSource, saveToStorage = false } = options;
  
  try {
    console.log(`Starting export, saveToStorage=${saveToStorage}`);
    
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
    
    // Set the Save-To-Storage header if needed
    const headers: Record<string, string> = {};
    if (saveToStorage) {
      headers['Save-To-Storage'] = 'true';
    }
    
    // Call the edge function
    console.log(`Invoking DataExport edge function with saveToStorage=${saveToStorage}`);
    const { data, error } = await supabase.functions.invoke('DataExport', {
      body: JSON.stringify(requestBody),
      headers
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }
    
    console.log('Export result:', data);
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

/**
 * Get all exports for the current user
 */
export async function getUserExports(): Promise<StorageExport[]> {
  try {
    const { data, error } = await supabase
      .from('user_storage_exports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log('No exports found for user');
      return [];
    }
    
    // Make sure all expected fields are present
    return data.map(item => ({
      id: item.id,
      file_path: item.file_path || '',
      created_at: item.created_at || new Date().toISOString(),
      user_id: item.user_id || '',
      execution_id: item.execution_id || '',
      format: item.format || 'json',
      file_size: item.file_size || 0,
      file_name: item.file_name || getFileNameFromPath(item.file_path),
      file_type: item.file_type || item.format || 'json',
      file_url: item.file_url || getFileUrlFromPath(item.file_path),
      dataset_id: item.dataset_id || ''
    }));
  } catch (error) {
    console.error('Error fetching user exports:', error);
    return [];
  }
}

// Helper function to extract file name from path
function getFileNameFromPath(path: string): string {
  if (!path) return 'unknown-file';
  const parts = path.split('/');
  return parts[parts.length - 1];
}

// Helper function to generate a file URL from a path
function getFileUrlFromPath(path: string): string {
  if (!path) return '';
  const { data } = supabase.storage
    .from('dataset_exports')
    .getPublicUrl(path);
  return data.publicUrl;
}
