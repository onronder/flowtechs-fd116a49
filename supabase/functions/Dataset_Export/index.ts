
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { convertToCSV } from "./csvConverter.ts";

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
    const { executionId, format = 'json' } = await req.json();
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

    // Get data from execution_results
    const { data: results, error: resultsError } = await supabaseAdmin
      .from("dataset_execution_results")
      .select("results")
      .eq("execution_id", executionId)
      .single();

    if (resultsError || !results) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: resultsError?.message || "Results not found" 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }

    let exportData;
    let fileName;
    let contentType;
    let fileExtension;
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const datasetName = execution.dataset?.name || "dataset";
    const sanitizedName = datasetName.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    // Convert to the requested format
    switch (format.toLowerCase()) {
      case 'csv':
        exportData = convertToCSV(results.results);
        fileName = `${sanitizedName}_${timestamp}.csv`;
        contentType = "text/csv";
        fileExtension = "csv";
        break;
      case 'xlsx':
        // In a real implementation, you would convert to XLSX here
        // For this example, we'll return CSV as a fallback
        exportData = convertToCSV(results.results);
        fileName = `${sanitizedName}_${timestamp}.csv`;
        contentType = "text/csv";
        fileExtension = "csv";
        break;
      case 'json':
      default:
        exportData = JSON.stringify(results.results, null, 2);
        fileName = `${sanitizedName}_${timestamp}.json`;
        contentType = "application/json";
        fileExtension = "json";
        break;
    }

    // If requested, save the file to storage
    if (saveToStorage) {
      const filePath = `${execution.dataset?.user_id}/${execution.dataset_id}/${fileName}`;
      
      // Upload to storage
      const { data: upload, error: uploadError } = await supabaseAdmin.storage
        .from("dataset_exports")
        .upload(filePath, new Blob([exportData], { type: contentType }), {
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
          user_id: execution.dataset?.user_id,
          file_name: fileName,
          file_path: filePath,
          file_type: fileExtension,
          file_size: exportData.length,
          file_url: publicURL.publicUrl,
        });
      
      return new Response(
        JSON.stringify({
          success: true,
          fileName,
          fileType: contentType,
          fileSize: exportData.length,
          downloadUrl: publicURL.publicUrl,
        }),
        { headers: corsHeaders }
      );
    } else {
      // Return the file data directly
      return new Response(
        JSON.stringify({
          success: true,
          fileName,
          fileType: contentType,
          fileSize: exportData.length,
          data: exportData,
        }),
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Error in Dataset_Export:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
