
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    const { datasetId, userId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    // Get dataset configuration
    const { data: dataset, error: datasetError } = await supabaseClient
      .from("user_datasets")
      .select(`
        *,
        source:source_id(*)
      `)
      .eq("id", datasetId)
      .eq("user_id", userId)
      .single();
    
    if (datasetError) {
      return errorResponse(datasetError.message);
    }
    
    // Get query template
    const { data: template, error: templateError } = await supabaseClient
      .from("query_templates")
      .select("*")
      .eq("id", dataset.template_id)
      .single();
    
    if (templateError) {
      return errorResponse(templateError.message);
    }
    
    // Begin execution tracking
    const { data: execution, error: executionError } = await supabaseClient
      .from("dataset_executions")
      .insert({
        dataset_id: datasetId,
        user_id: userId,
        status: "running"
      })
      .select()
      .single();
    
    if (executionError) {
      return errorResponse(executionError.message, 500);
    }
    
    // Construct the GraphQL query
    const query = template.query_template;
    
    // Execute query with pagination
    const startTime = Date.now();
    const results = await executeShopifyQuery(
      dataset.source.config,
      query,
      template.resource_type
    );
    const endTime = Date.now();
    
    // Update execution record
    const { error: updateError } = await supabaseClient
      .from("dataset_executions")
      .update({
        status: "completed",
        end_time: new Date().toISOString(),
        row_count: results.length,
        execution_time_ms: endTime - startTime,
        data: results
      })
      .eq("id", execution.id);
    
    if (updateError) {
      return errorResponse(updateError.message, 500);
    }
    
    // Return preview results (first 10 items)
    return successResponse({
      success: true,
      executionId: execution.id,
      preview: results.slice(0, 10),
      totalCount: results.length
    });
  } catch (error) {
    console.error("Error in Pre_ExecuteDataset:", error);
    return errorResponse(error.message, 500);
  }
});

// Helper function to execute Shopify GraphQL query with pagination
async function executeShopifyQuery(credentials: any, query: string, resourceType: string) {
  let hasNextPage = true;
  let cursor = null;
  let allResults: any[] = [];
  let apiCallCount = 0;
  
  while (hasNextPage) {
    apiCallCount++;
    
    // Prepare variables with pagination
    const variables = {
      first: 250, // Shopify max per page
      after: cursor
    };
    
    // Execute the query
    const endpoint = `https://${credentials.storeName}.myshopify.com/admin/api/${credentials.api_version}/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": credentials.accessToken
      },
      body: JSON.stringify({ query, variables })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${errorText.substring(0, 200)}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }
    
    // Extract resource data and pagination info
    const resource = result.data[resourceType];
    const pageInfo = resource.pageInfo;
    const edges = resource.edges || [];
    
    // Process nodes
    const nodes = edges.map((edge: any) => edge.node);
    allResults = [...allResults, ...nodes];
    
    // Update pagination
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
    
    // Add delay to respect rate limits
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return allResults;
}
