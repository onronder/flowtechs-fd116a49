
// Pre_ExecuteDataset function - handles execution of predefined datasets
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";
import { markExecutionAsRunning, markExecutionAsCompleted, markExecutionAsFailed, fetchDatasetDetails, createSupabaseClient, logErrorToAuditLogs } from "./databaseService.ts";
import { fetchPaginatedData } from "./shopifyService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    console.log("Pre_ExecuteDataset function called");

    // Parse request
    let body;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      
      if (!text || text.trim() === '') {
        console.error("Empty request body");
        return errorResponse("Empty request body", 400);
      }
      
      body = JSON.parse(text);
      console.log("Parsed request body:", JSON.stringify(body));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { executionId, datasetId, userId, template: passedTemplate } = body;
    
    if (!executionId || !datasetId || !userId) {
      console.error("Missing required parameters");
      return errorResponse("Missing required parameters: executionId, datasetId, or userId", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return errorResponse("Server configuration error", 500);
    }
    
    // Create Supabase client with service role key for admin access
    const supabaseClient = createSupabaseClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey
    );

    try {
      // Update execution status to running
      await markExecutionAsRunning(supabaseClient, executionId);
      console.log(`Marked execution ${executionId} as running`);

      // Get dataset and template details
      let dataset, template;
      
      try {
        if (passedTemplate) {
          // Use the template passed from the parent function
          console.log("Using passed template:", passedTemplate.id);
          template = passedTemplate;
          
          // We still need the dataset with source
          const { dataset: datasetData } = await fetchDatasetDetails(supabaseClient, datasetId, userId);
          dataset = datasetData;
        } else {
          // Fetch both dataset and template
          const result = await fetchDatasetDetails(supabaseClient, datasetId, userId);
          dataset = result.dataset;
          template = result.template;
        }

        if (!dataset) {
          const errorMsg = `Dataset not found for ID: ${datasetId}`;
          console.error(errorMsg);
          await markExecutionAsFailed(supabaseClient, executionId, errorMsg);
          await logErrorToAuditLogs(supabaseClient, userId, datasetId, executionId, "Dataset not found", { datasetId });
          return errorResponse(errorMsg, 404);
        }

        console.log("Using dataset:", dataset?.id, "Dataset type:", dataset?.dataset_type);
        console.log("Using template:", template?.id, "Query:", template?.query_template?.substring(0, 100) + "...");
      } catch (fetchError) {
        console.error("Failed to fetch dataset or template:", fetchError);
        await markExecutionAsFailed(supabaseClient, executionId, `Failed to fetch dataset or template: ${fetchError.message}`);
        await logErrorToAuditLogs(supabaseClient, userId, datasetId, executionId, "Failed to fetch dataset or template", { 
          error: fetchError.message 
        });
        return errorResponse(`Fetch error: ${fetchError.message}`, 500);
      }
      
      if (!dataset || !dataset.source || !dataset.source.config) {
        const errorMsg = "Missing or invalid source configuration";
        console.error(errorMsg, "Dataset details:", JSON.stringify({
          id: dataset?.id,
          hasSource: !!dataset?.source,
          hasConfig: !!dataset?.source?.config
        }));
        await markExecutionAsFailed(supabaseClient, executionId, errorMsg);
        await logErrorToAuditLogs(supabaseClient, userId, datasetId, executionId, "Missing source configuration", { 
          datasetId,
          hasSource: !!dataset?.source,
          hasConfig: !!dataset?.source?.config
        });
        return errorResponse(errorMsg, 400);
      }
      
      if (!template || !template.query_template) {
        const errorMsg = "Missing or invalid template query";
        console.error(errorMsg, "Template details:", JSON.stringify({
          id: template?.id,
          hasQuery: !!template?.query_template
        }));
        await markExecutionAsFailed(supabaseClient, executionId, errorMsg);
        await logErrorToAuditLogs(supabaseClient, userId, datasetId, executionId, "Missing template query", { 
          templateId: template?.id,
          hasQuery: !!template?.query_template
        });
        return errorResponse(errorMsg, 400);
      }

      console.log("Starting data fetch from external API");
      // Execute the query with pagination
      try {
        const { results, apiCallCount, executionTime, apiErrors } = await fetchPaginatedData(
          dataset.source.config,
          template.query_template,
          template.resource_type || "Product" // Default to Product if not specified
        );

        console.log(`Dataset execution completed: ${executionId} - ${results.length} rows in ${executionTime}ms`);

        // Log any API errors to audit_logs
        if (apiErrors && apiErrors.length > 0) {
          await logErrorToAuditLogs(supabaseClient, userId, datasetId, executionId, "API errors occurred during execution", { 
            apiErrors,
            resourceType: template.resource_type || "Product"
          });
          console.warn("API errors occurred but execution completed:", apiErrors);
        }

        // Update execution record with results
        await markExecutionAsCompleted(supabaseClient, executionId, results, executionTime, apiCallCount);
        
        return successResponse({
          message: "Dataset execution completed successfully",
          executionId,
          rowCount: results.length,
          executionTime
        });
      } catch (fetchError) {
        console.error("API data fetch error:", fetchError);
        const errorMessage = typeof fetchError === 'object' && fetchError !== null 
          ? fetchError.message || JSON.stringify(fetchError)
          : String(fetchError);
          
        await markExecutionAsFailed(supabaseClient, executionId, `API fetch error: ${errorMessage}`);
        await logErrorToAuditLogs(supabaseClient, userId, datasetId, executionId, "API fetch error", { 
          error: errorMessage,
          stack: fetchError.stack,
          config: JSON.stringify({
            storeName: dataset.source.config.storeName,
            apiVersion: dataset.source.config.api_version || '2023-01'
          }),
          resourceType: template.resource_type || "Product"
        });
        return errorResponse(`API fetch error: ${errorMessage}`, 500);
      }
    } catch (executionError) {
      console.error("Execution error:", executionError);
      
      // Update execution record with error
      try {
        const errorMessage = typeof executionError === 'object' && executionError !== null 
          ? executionError.message || JSON.stringify(executionError)
          : String(executionError);
          
        await markExecutionAsFailed(supabaseClient, executionId, errorMessage);
        await logErrorToAuditLogs(supabaseClient, userId, datasetId, executionId, "Execution error", { 
          error: errorMessage,
          stack: executionError.stack
        });
      } catch (updateError) {
        console.error("Failed to update execution status after error:", updateError);
      }

      return errorResponse(`Execution error: ${executionError.message || "Unknown error"}`, 500);
    }
  } catch (error) {
    console.error("Error in Pre_ExecuteDataset:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
