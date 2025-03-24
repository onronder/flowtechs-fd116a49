
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ExportResponse } from "./types.ts";
import { corsHeaders, handleCorsRequest, createErrorResponse, createSuccessResponse } from "./corsHandler.ts";
import { parseRequest } from "./requestParser.ts";
import { getSupabaseAdmin, getExecutionData, getExecutionResults, saveExportRecord } from "./databaseService.ts";
import { uploadToStorage, generateFileName, getContentType, getFileExtension } from "./storageService.ts";
import { convertToFormat } from "./formatConverter.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsRequest(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Parse and validate request
    const { executionId, format = 'json', fileName, dataSource } = await parseRequest(req);
    const saveToStorage = req.headers.get('Save-To-Storage') === 'true';

    console.log(`Processing export request for execution ID: ${executionId}, format: ${format}, saveToStorage: ${saveToStorage}`);

    // Initialize Supabase client
    const supabaseAdmin = getSupabaseAdmin();

    // Get execution details
    const execution = await getExecutionData(supabaseAdmin, executionId);

    // Handle direct data source if provided
    let resultsData;
    if (dataSource && Array.isArray(dataSource)) {
      // Use provided data directly
      resultsData = { results: dataSource };
      console.log(`Using direct data source with ${dataSource.length} records`);
    } else {
      // Get data from execution_results
      resultsData = await getExecutionResults(supabaseAdmin, executionId);
    }

    // Convert data to the requested format
    const { exportData, contentType, fileExtension } = await convertToFormat(
      resultsData.results,
      format
    );

    // Generate file name
    const outputFileName = generateFileName(
      execution.dataset?.name || "dataset",
      format,
      fileName
    );

    // If requested, save the file to storage
    if (saveToStorage) {
      console.log("Saving file to storage...");
      const userId = execution.dataset?.user_id;
      if (!userId) {
        return createErrorResponse("User ID not found for dataset", 400);
      }
      
      const filePath = `${userId}/${execution.dataset_id}/${outputFileName}`;
      
      try {
        // Upload to storage
        const publicUrl = await uploadToStorage(
          supabaseAdmin,
          filePath,
          exportData,
          contentType
        );
        
        console.log(`File uploaded successfully to ${filePath}, public URL: ${publicUrl}`);
        
        // Create record in the exports table
        await saveExportRecord(supabaseAdmin, {
          executionId,
          datasetId: execution.dataset_id,
          userId,
          fileName: outputFileName,
          filePath,
          fileType: fileExtension,
          fileSize: exportData.length,
          fileUrl: publicUrl
        });
        
        const response: ExportResponse = {
          success: true,
          fileName: outputFileName,
          fileType: contentType,
          fileSize: exportData.length,
          downloadUrl: publicUrl,
        };
        
        console.log("Export completed successfully with storage");
        return createSuccessResponse(response);
      } catch (error) {
        console.error("Error in storage operations:", error);
        return createErrorResponse(
          error instanceof Error ? error.message : "Error in storage operations",
          500
        );
      }
    } else {
      // Return the data in the response body
      const responseBody: ExportResponse = {
        success: true,
        fileName: outputFileName,
        fileType: contentType,
        fileSize: exportData.length,
        data: exportData
      };
      
      console.log("Export completed successfully without storage");
      return createSuccessResponse(responseBody);
    }
  } catch (error) {
    console.error("Error in DataExport:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error occurred",
      500
    );
  }
});
