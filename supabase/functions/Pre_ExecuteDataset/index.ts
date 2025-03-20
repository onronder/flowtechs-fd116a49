
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
    const { executionId, datasetId, userId } = await req.json();
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Update execution status to running
    await supabaseClient
      .from("dataset_executions")
      .update({
        status: "running",
        start_time: new Date().toISOString()
      })
      .eq("id", executionId);

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
        const endpoint = `https://${shopifyConfig.storeName}.myshopify.com/admin/api/${shopifyConfig.api_version}/graphql.json`;
        
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
          throw new Error(`Shopify API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const result = await response.json();
        if (result.errors) {
          throw new Error(`GraphQL error: ${result.errors[0].message}`);
        }

        // Extract the results - this will depend on your query structure
        const resourceType = template.resource_type;
        const resource = result.data[resourceType];
        const edges = resource.edges || [];
        const pageInfo = resource.pageInfo;
        
        // Process nodes
        const nodes = edges.map((edge: any) => edge.node);
        allResults = [...allResults, ...nodes];

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

      // Update execution record with results
      await supabaseClient
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

      console.log(`Dataset execution completed: ${executionId} - ${allResults.length} rows`);
    } catch (executionError) {
      console.error("Execution error:", executionError);
      
      // Update execution record with error
      await supabaseClient
        .from("dataset_executions")
        .update({
          status: "failed",
          end_time: new Date().toISOString(),
          error_message: executionError.message
        })
        .eq("id", executionId);
    }

    // Return a response
    return successResponse({
      message: "Dataset execution initiated"
    });
  } catch (error) {
    console.error("Error in Pre_ExecuteDataset:", error);
    return errorResponse(error.message, 500);
  }
});
