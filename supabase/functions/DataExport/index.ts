
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ExportOptions, ExportFormat, ExportResponse } from "./types.ts";
import { convertToCSV } from "./csvConverter.ts";
import { convertToXLSX } from "./xlsxConverter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, save-to-storage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { executionId, format = 'json', fileName = null, dataSource = null }: ExportOptions = await req.json();
    const saveToStorage = req.headers.get('Save-To-Storage') === 'true';

    if (!executionId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing executionId parameter" 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get execution details
    const { data: execution, error: executionError } = await supabaseAdmin
      .from("dataset_executions")
      .select(`
        id,
        dataset_id,
        status,
        start_time,
        end_time,
        row_count,
        execution_time_ms,
        api_call_count,
        dataset:dataset_id(name, user_id)
      `)
      .eq("id", executionId)
      .single();

    if (executionError || !execution) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: executionError?.message || "Execution not found" 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // Handle direct data source if provided
    let results;
    if (dataSource) {
      // Use provided data directly
      results = { results: dataSource };
      console.log(`Using direct data source with ${dataSource.length} records`);
    } else {
      // Get data from execution_results
      const { data: resultsData, error: resultsError } = await supabaseAdmin
        .from("dataset_execution_results")
        .select("results")
        .eq("execution_id", executionId)
        .single();

      if (resultsError || !resultsData) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: resultsError?.message || "Results not found" 
          }),
          { headers: corsHeaders, status: 404 }
        );
      }
      
      results = resultsData;
    }

    let exportData: string;
    let contentType: string;
    let fileExtension: string;
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const datasetName = execution.dataset?.name || "dataset";
    const sanitizedName = datasetName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const outputFileName = fileName || `${sanitizedName}_${timestamp}`;

    // Convert to the requested format
    switch (format.toLowerCase() as ExportFormat) {
      case 'csv':
        exportData = convertToCSV(results.results);
        contentType = "text/csv";
        fileExtension = "csv";
        break;
      case 'xlsx':
        exportData = await convertToXLSX(results.results);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        fileExtension = "xlsx";
        break;
      case 'json':
      default:
        exportData = JSON.stringify(results.results, null, 2);
        contentType = "application/json";
        fileExtension = "json";
        break;
    }

    const finalFileName = `${outputFileName}.${fileExtension}`;

    // If requested, save the file to storage
    if (saveToStorage) {
      const userId = execution.dataset?.user_id;
      if (!userId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "User ID not found for dataset" 
          }),
          { headers: corsHeaders, status: 400 }
        );
      }
      
      const filePath = `${userId}/${execution.dataset_id}/${finalFileName}`;
      
      // Create a proper Blob with the right content type
      const fileBlob = new Blob([exportData], { type: contentType });
      
      // Upload to storage
      const { data: upload, error: uploadError } = await supabaseAdmin.storage
        .from("dataset_exports")
        .upload(filePath, fileBlob, {
          contentType,
          upsert: true,
        });
      
      if (uploadError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error saving file: ${uploadError.message}` 
          }),
          { headers: corsHeaders, status: 500 }
        );
      }
      
      // Get public URL for the file
      const { data: publicURL } = supabaseAdmin.storage
        .from("dataset_exports")
        .getPublicUrl(filePath);
      
      // Create record in the exports table
      await supabaseAdmin
        .from("user_storage_exports")
        .insert({
          execution_id: executionId,
          dataset_id: execution.dataset_id,
          user_id: userId,
          file_name: finalFileName,
          file_path: filePath,
          file_type: fileExtension,
          file_size: exportData.length,
          file_url: publicURL.publicUrl,
        });
      
      const response: ExportResponse = {
        success: true,
        fileName: finalFileName,
        fileType: contentType,
        fileSize: exportData.length,
        downloadUrl: publicURL.publicUrl,
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: corsHeaders }
      );
    } else {
      // Return the file data directly for download
      const downloadHeaders = {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${finalFileName}"`,
      };
      
      // Return the file directly
      return new Response(exportData, { headers: downloadHeaders });
    }
  } catch (error) {
    console.error("Error in DataExport:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
