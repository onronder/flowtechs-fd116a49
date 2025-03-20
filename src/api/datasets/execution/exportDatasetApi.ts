
import { supabase } from "@/integrations/supabase/client";
import { ExportOptions } from "../datasetsApiTypes";

/**
 * Export dataset
 */
export async function exportDataset(executionId: string, options: ExportOptions = { format: 'json' }) {
  try {
    console.log(`Exporting dataset for execution ID: ${executionId}, format: ${options.format}`);
    
    const payload = JSON.stringify({ 
      executionId, 
      format: options.format 
    });
    
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Export",
      {
        body: payload,
        headers: { 
          'Content-Type': 'application/json',
          'Save-To-Storage': options.saveToStorage ? 'true' : 'false' 
        }
      }
    );
    
    if (error) {
      console.error("Error exporting dataset:", error);
      throw error;
    }
    
    console.log("Dataset export response:", data);
    return data;
  } catch (error) {
    console.error("Error exporting dataset:", error);
    throw error;
  }
}

/**
 * Get dataset exports
 */
export async function getDatasetExports(executionId: string) {
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
    return data;
  } catch (error) {
    console.error("Error fetching exports:", error);
    throw error;
  }
}
