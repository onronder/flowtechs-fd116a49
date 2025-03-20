
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";
import { convertToCSV } from "./csvConverter.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    const { executionId, userId, format = 'json' } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    // Get execution data
    const { data: execution, error: executionError } = await supabaseClient
      .from("dataset_executions")
      .select(`
        *,
        dataset:dataset_id(*)
      `)
      .eq("id", executionId)
      .eq("user_id", userId)
      .single();
    
    if (executionError) {
      return errorResponse(executionError.message);
    }
    
    if (execution.status !== "completed") {
      return errorResponse(`Dataset execution is ${execution.status}`);
    }
    
    // Get the data
    const data = execution.data || [];
    
    // Convert data to requested format
    let exportData;
    let contentType;
    let fileExtension;
    
    switch (format.toLowerCase()) {
      case 'csv':
        exportData = convertToCSV(data);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'xlsx':
        // XLSX conversion would be implemented here
        // This is more complex and may require additional libraries
        return errorResponse("XLSX export not yet implemented", 501);
      case 'json':
      default:
        exportData = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${execution.dataset.name.replace(/\s+/g, '_')}_${timestamp}.${fileExtension}`;
    
    // Save to storage for Pro users if requested
    const saveToStorage = req.headers.get('Save-To-Storage') === 'true';
    let storageResult = null;
    
    if (saveToStorage) {
      const filePath = `datasets/${userId}/${filename}`;
      
      const { data: storageData, error: storageError } = await supabaseClient.storage
        .from('user_data')
        .upload(filePath, exportData, {
          contentType,
          upsert: false
        });
      
      if (storageError) {
        return errorResponse(`Storage error: ${storageError.message}`, 500);
      }
      
      // Record the export in database
      const { data: exportRecord, error: exportError } = await supabaseClient
        .from("user_storage_exports")
        .insert({
          user_id: userId,
          execution_id: executionId,
          format: format.toLowerCase(),
          file_path: filePath,
          file_size: exportData.length
        })
        .select()
        .single();
      
      if (exportError) {
        return errorResponse(`Export record error: ${exportError.message}`, 500);
      }
      
      storageResult = {
        id: exportRecord.id,
        filePath,
        fileSize: exportData.length
      };
    }
    
    // Return success with download URL or direct data
    return successResponse({
      success: true,
      format: format.toLowerCase(),
      filename,
      storage: storageResult,
      data: exportData.length > 10000 ? null : exportData // Only return data directly if it's small
    });
  } catch (error) {
    console.error("Error in Dataset_Export:", error);
    return errorResponse(error.message, 500);
  }
});
