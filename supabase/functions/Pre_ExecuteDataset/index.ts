
// supabase/functions/Pre_ExecuteDataset/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

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

    const { executionId, datasetId, userId } = body;
    
    if (!executionId || !datasetId || !userId) {
      console.error("Missing required parameters");
      return errorResponse("Missing required parameters: executionId, datasetId, or userId", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return errorResponse("Server configuration error", 500);
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { 
        global: { 
          headers: { 
            Authorization: req.headers.get("Authorization") || "" 
          } 
        } 
      }
    );

    // Update execution status to running
    const { error: updateError } = await supabaseClient
      .from("dataset_executions")
      .update({
        status: "running",
        start_time: new Date().toISOString()
      })
      .eq("id", executionId);

    if (updateError) {
      console.error("Error updating execution status:", updateError);
      return errorResponse(`Error updating execution status: ${updateError.message}`, 500);
    }

    try {
      // Get dataset and template details
      const { data: dataset, error: datasetError } = await supabaseClient
        .from("user_datasets")
        .select(`
          *,
          source:source_id(*),
          template:template_id(*)
        `)
        .eq("id", datasetId)
        .eq("user_id", userId)
        .single();

      if (datasetError || !dataset) {
        throw new Error(`Dataset error: ${datasetError?.message || "Dataset not found"}`);
      }

      // Get the template
      const template = dataset.template;
      if (!template) {
        throw new Error("Template not found");
      }

      console.log("Using template:", template.id, "Query:", template.query_template?.substring(0, 100) + "...");

      // Execute the query with pagination
      const startTime = Date.now();
      let allResults = [];
      let apiCallCount = 0;
      let hasNextPage = true;
      let cursor = null;

      while (hasNextPage) {
        apiCallCount++;
        
        // Execute GraphQL query
        const variables = {
          first: 250, // Shopify max per page
          after: cursor
        };

        const shopifyConfig = dataset.source.config;
        
        if (!shopifyConfig.storeName || !shopifyConfig.api_version || !shopifyConfig.accessToken) {
          throw new Error("Missing Shopify configuration values");
        }
        
        const endpoint = `https://${shopifyConfig.storeName}.myshopify.com/admin/api/${shopifyConfig.api_version || '2023-10'}/graphql.json`;
        
        console.log(`Making API call #${apiCallCount} to Shopify endpoint`);
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": shopifyConfig.accessToken
          },
          body: JSON.stringify({
            query: template.query_template,
            variables
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Shopify API error:", response.status, errorText);
          throw new Error(`Shopify API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const result = await response.json();
        if (result.errors) {
          console.error("GraphQL errors:", result.errors);
          throw new Error(`GraphQL error: ${result.errors[0].message}`);
        }

        // Extract the results - this will depend on your query structure
        const resourceType = template.resource_type;
        
        if (!resourceType || !result.data || !result.data[resourceType]) {
          console.error("Invalid response structure:", JSON.stringify(result).substring(0, 200));
          throw new Error(`Invalid response structure. Resource type '${resourceType}' not found in response`);
        }
        
        const resource = result.data[resourceType];
        const edges = resource.edges || [];
        const pageInfo = resource.pageInfo;
        
        // Process nodes
        const nodes = edges.map((edge: any) => edge.node);
        allResults = [...allResults, ...nodes];

        console.log(`Retrieved ${nodes.length} nodes, total so far: ${allResults.length}`);

        // Update pagination
        hasNextPage = pageInfo.hasNextPage;
        cursor = pageInfo.endCursor;

        // If we have more pages, add a delay to respect rate limits
        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`Dataset execution completed: ${executionId} - ${allResults.length} rows in ${executionTime}ms`);

      // Update execution record with results
      const { error: completeError } = await supabaseClient
        .from("dataset_executions")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
          row_count: allResults.length,
          execution_time_ms: executionTime,
          api_call_count: apiCallCount,
          data: allResults
        })
        .eq("id", executionId);

      if (completeError) {
        console.error("Error updating execution record with results:", completeError);
        throw new Error(`Failed to update execution record: ${completeError.message}`);
      }
    } catch (executionError) {
      console.error("Execution error:", executionError);
      
      // Update execution record with error
      await supabaseClient
        .from("dataset_executions")
        .update({
          status: "failed",
          end_time: new Date().toISOString(),
          error_message: executionError.message || "Unknown execution error"
        })
        .eq("id", executionId);

      return errorResponse(`Execution error: ${executionError.message}`, 500);
    }

    // Return a response
    return successResponse({
      message: "Dataset execution completed successfully",
      executionId
    });
  } catch (error) {
    console.error("Error in Pre_ExecuteDataset:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
