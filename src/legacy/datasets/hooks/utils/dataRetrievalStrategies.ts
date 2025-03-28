import { fetchDatasetPreview } from "@/api/datasets/execution/previewDatasetApi";
import { fetchDirectExecutionData } from "@/api/datasets/execution/directDatabaseAccess";
import { supabase } from "@/integrations/supabase/client";
import { PreviewOptions, PreviewData } from "../previewTypes";
import { transformExecutionDataToPreviewData, createMinimalPreviewData } from "./previewDataTransformer";

/**
 * Strategy to fetch data from the Dataset_Preview edge function
 */
export async function fetchFromPreviewApi(
  executionId: string, 
  options: PreviewOptions = {}
): Promise<{ source: 'preview', data: PreviewData }> {
  console.log("[Preview] Attempting to fetch data from Dataset_Preview edge function");
  
  const data = await fetchDatasetPreview(executionId, {
    ...options,
    checkStatus: options.checkStatus || false
  });
  
  console.log("[Preview] Preview data received successfully from edge function");
  return { source: 'preview', data: data as PreviewData };
}

/**
 * Strategy to fetch data directly from the database as a fallback
 */
export async function fetchFromDirectDatabase(
  executionId: string
): Promise<{ source: 'direct', data: PreviewData }> {
  console.log("[Preview] Trying direct database access as fallback");
  
  const directData = await fetchDirectExecutionData(executionId);
  
  if (!directData) {
    throw new Error("No data available from direct database access");
  }
  
  console.log("[Preview] Successfully retrieved data directly from database");
  
  // Type checking before casting
  if (typeof directData !== 'object' || directData === null || Array.isArray(directData)) {
    throw new Error("Invalid data format from direct database access");
  }
  
  // Safely cast the data to our expected structure
  const executionData = directData as unknown as any;
  
  // Validate the required properties
  if (!('status' in executionData)) {
    throw new Error("Missing status in execution data");
  }
  
  const transformedData = transformExecutionDataToPreviewData(executionData, executionId);
  
  console.log("[Preview] Transformed direct data:", transformedData);
  return { source: 'direct', data: transformedData };
}

/**
 * Strategy to fetch minimal execution data as a last resort
 */
export async function fetchMinimalExecutionData(
  executionId: string
): Promise<{ source: 'minimal', data: PreviewData }> {
  console.log("[Preview] Attempting minimal execution data fetch");
  
  // Check if user is authenticated first
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Authentication required to view preview data");
  }
  
  const { data: execution, error } = await supabase
    .from("dataset_executions")
    .select("id, status, start_time, end_time, row_count, error_message")
    .eq("id", executionId)
    .maybeSingle();
  
  if (!execution) {
    throw new Error(`Failed to retrieve minimal execution data: ${error?.message}`);
  }
  
  console.log("[Preview] Retrieved minimal execution data:", execution);
  
  const minimalData = createMinimalPreviewData(execution);
  
  return { source: 'minimal', data: minimalData };
}
