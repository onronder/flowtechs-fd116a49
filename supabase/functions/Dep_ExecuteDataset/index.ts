
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
    
    // Get dependent query template
    const { data: template, error: templateError } = await supabaseClient
      .from("dependent_query_templates")
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
    
    // Execute the primary and secondary queries
    const startTime = Date.now();
    let apiCallCount = 0;
    
    // Step 1: Execute primary query to get initial data
    console.log("Executing primary query...");
    const primaryResults = await executeShopifyQuery(
      dataset.source.config,
      template.primary_query,
      (results) => {
        apiCallCount++;
        return results;
      }
    );
    
    // Step 2: Extract IDs using idPath from primary results
    console.log("Extracting IDs from primary results...");
    const ids = extractIds(primaryResults, template.id_path);
    
    // Step 3: Execute secondary query with extracted IDs
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
    
    // Step 4: Merge results according to merge strategy
    console.log("Merging results...");
    const mergedResults = mergeResults(
      primaryResults, 
      secondaryResults, 
      template.merge_strategy
    );
    
    const endTime = Date.now();
    
    // Update execution record
    const { error: updateError } = await supabaseClient
      .from("dataset_executions")
      .update({
        status: "completed",
        end_time: new Date().toISOString(),
        row_count: mergedResults.length,
        execution_time_ms: endTime - startTime,
        api_call_count: apiCallCount,
        data: mergedResults
      })
      .eq("id", execution.id);
    
    if (updateError) {
      return errorResponse(updateError.message, 500);
    }
    
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

// Execute a Shopify GraphQL query with tracking
async function executeShopifyQuery(
  credentials: any, 
  query: string,
  trackApiCall: (results: any) => any
) {
  let hasNextPage = true;
  let cursor = null;
  let allResults: any[] = [];
  
  while (hasNextPage) {
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
    trackApiCall(result);
    
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }
    
    // Extract data and pagination info - different queries might have different root fields
    const queryResponse = result.data;
    const rootFields = Object.keys(queryResponse);
    
    if (rootFields.length === 0) {
      throw new Error("No data returned from query");
    }
    
    const resource = queryResponse[rootFields[0]];
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

// Extract IDs from results using a JSON path
function extractIds(results: any[], idPath: string) {
  const ids = new Set<string>();
  
  // Parse idPath (e.g., "variants.edges.node.id")
  const pathParts = idPath.split(".");
  
  results.forEach(item => {
    try {
      let current = item;
      for (const part of pathParts) {
        if (Array.isArray(current)) {
          // Handle array navigation
          const nextLevel = [];
          for (const element of current) {
            if (element && element[part] !== undefined) {
              nextLevel.push(element[part]);
            }
          }
          current = nextLevel;
        } else if (current && current[part] !== undefined) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }
      
      if (current !== undefined) {
        if (Array.isArray(current)) {
          current.forEach(id => {
            if (typeof id === 'string') ids.add(id);
          });
        } else if (typeof current === 'string') {
          ids.add(current);
        }
      }
    } catch (e) {
      console.error(`Error extracting ID using path ${idPath}:`, e);
    }
  });
  
  return Array.from(ids);
}

// Execute secondary queries with batched IDs
async function executeSecondaryQueries(
  credentials: any,
  queryTemplate: string,
  ids: string[],
  trackApiCall: (results: any) => any
) {
  const results: any[] = [];
  const batchSize = 50; // Adjust based on query complexity
  
  // Split IDs into batches
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    
    // Inject IDs into query
    const query = queryTemplate.replace('{{IDS}}', JSON.stringify(batchIds));
    
    // Execute the query
    const endpoint = `https://${credentials.storeName}.myshopify.com/admin/api/${credentials.api_version}/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": credentials.accessToken
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${errorText.substring(0, 200)}`);
    }
    
    const result = await response.json();
    trackApiCall(result);
    
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }
    
    // Extract data - different queries might have different root fields
    const queryResponse = result.data;
    const rootFields = Object.keys(queryResponse);
    
    if (rootFields.length === 0) {
      continue; // No data in this batch
    }
    
    // Get nodes from the response
    const resource = queryResponse[rootFields[0]];
    const nodes = resource.nodes || [];
    
    results.push(...nodes);
    
    // Add delay to respect rate limits
    if (i + batchSize < ids.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// Merge results based on strategy
function mergeResults(
  primaryResults: any[],
  secondaryResults: any[],
  mergeStrategy: string
) {
  switch (mergeStrategy) {
    case 'nested':
      // Add secondary results as a nested property on primary results
      return primaryResults.map(primary => ({
        ...primary,
        secondaryData: secondaryResults.filter(
          secondary => primary.id === secondary.primaryId
        )
      }));
      
    case 'flat':
      // Create new objects combining primary and secondary data
      return primaryResults.flatMap(primary => {
        const related = secondaryResults.filter(
          secondary => primary.id === secondary.primaryId
        );
        
        if (related.length === 0) {
          return [{ ...primary, hasSecondaryData: false }];
        }
        
        return related.map(secondary => ({
          ...primary,
          ...secondary,
          hasSecondaryData: true
        }));
      });
      
    case 'reference':
    default:
      // Just return primary results with IDs that can be used to lookup secondary data
      return primaryResults;
  }
}
