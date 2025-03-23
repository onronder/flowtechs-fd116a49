
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, errorResponse, successResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "./utils.ts";
import { 
  fetchDatasetAndSource, 
  fetchTemplate, 
  createExecutionRecord, 
  updateExecutionRecord 
} from "./databaseService.ts";
import { 
  executeShopifyQuery, 
  extractIds, 
  executeSecondaryQueries 
} from "./shopifyService.ts";
import { mergeResults } from "./resultProcessor.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    console.log("Dep_ExecuteDataset function called");
    const { datasetId, userId, executionId } = await req.json();
    
    console.log(`Processing dependent dataset execution for datasetId: ${datasetId}, userId: ${userId}`);
    
    // Initialize Supabase client
    const supabaseClient = createSupabaseClient(req.headers.get("Authorization") || "");
    
    // Step 1: Get dataset and template configuration
    const dataset = await fetchDatasetAndSource(supabaseClient, datasetId, userId);
    const template = await fetchTemplate(supabaseClient, dataset.template_id);
    
    // Step 2: Create or use execution record
    const execution = executionId 
      ? { id: executionId } 
      : await createExecutionRecord(supabaseClient, datasetId, userId);
    
    // Step 3: Execute queries and merge results
    const startTime = Date.now();
    let apiCallCount = 0;
    
    // Execute primary query to get initial data
    console.log("Executing primary query...");
    const primaryResults = await executeShopifyQuery(
      dataset.source.config,
      template.primary_query,
      (results) => {
        apiCallCount++;
        return results;
      }
    );
    
    // Extract IDs using idPath from primary results
    console.log("Extracting IDs from primary results...");
    const ids = extractIds(primaryResults, template.id_path);
    
    // Execute secondary query with extracted IDs
    console.log(`Executing secondary query with ${ids.length} IDs...`);
    const secondaryResults = await executeSecondaryQueries(
      dataset.source.config,
      template.secondary_query,
      ids,
      (results) => {
        apiCallCount++;
        return results;
      }
    );
    
    // Merge results according to merge strategy
    console.log("Merging results...");
    const mergedResults = mergeResults(
      primaryResults, 
      secondaryResults, 
      template.merge_strategy
    );
    
    const endTime = Date.now();
    
    // Update execution record with results
    await updateExecutionRecord(
      supabaseClient,
      execution.id,
      mergedResults,
      startTime,
      endTime,
      apiCallCount
    );
    
    // Return preview results (first 10 items)
    return successResponse({
      success: true,
      executionId: execution.id,
      preview: mergedResults.slice(0, 10),
      totalCount: mergedResults.length
    });
  } catch (error) {
    console.error("Error in Dep_ExecuteDataset:", error);
    return errorResponse(error.message, 500);
  }
});
