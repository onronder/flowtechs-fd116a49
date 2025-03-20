import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";

interface ExecuteCustomDatasetRequest {
  sourceId: string;    // Source ID to connect to
  query: string;       // GraphQL query to execute
  variables?: Record<string, any>; // Optional variables for the query
  maxItems?: number;   // Maximum number of items to return (default: 1000)
  userId?: string;     // Optional user ID for authentication
  executionId?: string; // Optional execution ID for updating existing execution
  datasetId?: string;  // Optional dataset ID for tracked executions
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestData: ExecuteCustomDatasetRequest = await req.json();
    const { sourceId, query, variables = {}, maxItems = 1000, executionId, datasetId } = requestData;

    if (!sourceId) {
      return errorResponse("Missing sourceId parameter", 400);
    }

    if (!query) {
      return errorResponse("Missing query parameter", 400);
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the source from the database
    const { data: source, error: sourceError } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) {
      return errorResponse(`Source not found: ${sourceError.message}`, 404);
    }

    if (source.source_type !== "shopify") {
      return errorResponse("Only Shopify sources are supported currently", 400);
    }

    // Check that we have required Shopify credentials
    const config = source.config;
    if (!config.storeName || !config.accessToken || !config.api_version) {
      return errorResponse("Invalid Shopify source configuration", 400);
    }

    // Track execution metrics
    const startTime = Date.now();
    let apiCallCount = 0;
    let totalItems = 0;

    // Execute the GraphQL query against Shopify
    const results = await executeGraphQLWithPagination(
      config,
      query,
      variables,
      maxItems,
      (count) => {
        apiCallCount += count;
      }
    );

    const endTime = Date.now();
    totalItems = results.length;

    // Create or update execution record
    let finalExecutionId = executionId;
    const userId = requestData.userId || await getUserIdFromRequest(req, supabaseAdmin);

    if (userId) {
      if (executionId) {
        // Update existing execution
        const { error: updateError } = await supabaseAdmin
          .from("dataset_executions")
          .update({
            status: "completed",
            end_time: new Date(endTime).toISOString(),
            row_count: totalItems,
            execution_time_ms: endTime - startTime,
            api_call_count: apiCallCount,
            data: results
          })
          .eq("id", executionId);

        if (updateError) {
          console.error("Error updating execution record:", updateError);
        }
      } else {
        // Create new execution record
        const { data: execution, error: executionError } = await supabaseAdmin
          .from("dataset_executions")
          .insert({
            user_id: userId,
            dataset_id: datasetId || null, // May be a direct execution not tied to a saved dataset
            status: "completed",
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            row_count: totalItems,
            execution_time_ms: endTime - startTime,
            api_call_count: apiCallCount,
            data: results,
            metadata: {
              source_id: sourceId,
              query: query,
              direct_execution: !datasetId
            }
          })
          .select()
          .single();

        if (executionError) {
          console.error("Error creating execution record:", executionError);
        } else {
          finalExecutionId = execution.id;
        }
      }
    }

    // Return the results
    return successResponse({
      executionId: finalExecutionId,
      results,
      metadata: {
        totalItems,
        executionTimeMs: endTime - startTime,
        apiCallCount
      }
    });
  } catch (error) {
    console.error("Error in Cust_ExecuteDataset:", error);
    return errorResponse(error.message, 500);
  }
});

// Helper function to get the user ID from the authorization header
async function getUserIdFromRequest(req: Request, supabase: any): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  try {
    const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !data.user) return null;
    return data.user.id;
  } catch (error) {
    console.error("Error getting user ID from request:", error);
    return null;
  }
}

// Helper function to execute GraphQL with pagination
async function executeGraphQLWithPagination(
  config: any,
  query: string,
  variables: Record<string, any>,
  maxItems: number,
  onApiCall: (count: number) => void
): Promise<any[]> {
  let hasNextPage = true;
  let cursor = null;
  let allResults: any[] = [];
  let pageInfo = null;
  let apiCallCount = 0;
  
  // Shopify API endpoint
  const shopifyEndpoint = `https://${config.storeName}.myshopify.com/admin/api/${config.api_version}/graphql.json`;

  // Process query to check if it has pagination variables
  const queryHasFirstVariable = query.includes("$first:");
  const queryHasAfterVariable = query.includes("$after:");

  // For queries that don't include pagination variables, we add them
  let processedQuery = query;
  if (!queryHasFirstVariable || !queryHasAfterVariable) {
    // Add pagination variables to the query if they don't exist
    processedQuery = processedQuery.replace(
      /query\s*(\w*)\s*(\(\s*([\w\s\$:,!]*)\s*\))?\s*{/,
      (match, name, fullParams, params) => {
        const newParams = params ? params.trim() + ', ' : '';
        return `query ${name || ''} (${!fullParams ? '' : ''}${newParams}$first: Int, $after: String) {`;
      }
    );

    // Find each "edges" pattern and add pagination arguments
    processedQuery = processedQuery.replace(
      /(\w+\s*(?:\(\s*[^)]*\s*\))?\s*{[\s\n]*)(?!first)([^{]*edges\s*{)/g,
      (match, prefix, suffix) => {
        // Check if there are already arguments
        if (prefix.includes('(')) {
          // Replace the closing parenthesis with the pagination arguments
          return prefix.replace(/\)/, ', first: $first, after: $after)') + suffix;
        } else {
          // Add pagination arguments
          return `${prefix.trim()}(first: $first, after: $after) ${suffix}`;
        }
      }
    );
  }

  // Main pagination loop
  while (hasNextPage && allResults.length < maxItems) {
    apiCallCount++;
    onApiCall(1);

    // Calculate how many items to fetch in this batch
    const batchSize = Math.min(250, maxItems - allResults.length);

    // Prepare variables with pagination
    const paginationVariables = {
      ...variables,
      first: batchSize,
      after: cursor
    };

    try {
      // Execute the query
      const response = await fetch(shopifyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": config.accessToken
        },
        body: JSON.stringify({ 
          query: processedQuery, 
          variables: paginationVariables 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }

      // Find the edges and pageInfo in the result
      // We need to traverse the result to find the connection with edges and pageInfo
      const { edges, pageInfo: newPageInfo } = findConnectionInResult(result.data);

      if (!edges) {
        break; // No more results or invalid query
      }

      // Process nodes
      const nodes = edges.map((edge: any) => edge.node);
      allResults = [...allResults, ...nodes];

      // Update pagination info
      pageInfo = newPageInfo;
      hasNextPage = pageInfo?.hasNextPage || false;
      cursor = pageInfo?.endCursor || null;

      // Add delay to respect rate limits (2 requests per second)
      if (hasNextPage && allResults.length < maxItems) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Error executing GraphQL query:", error);
      throw error;
    }
  }

  return allResults;
}

// Helper function to find the connection with edges and pageInfo in a nested GraphQL result
function findConnectionInResult(data: any): { edges: any[]; pageInfo: any } {
  if (!data) return { edges: [], pageInfo: null };

  // Check if this is a connection with edges and pageInfo
  if (data.edges && data.pageInfo) {
    return {
      edges: data.edges,
      pageInfo: data.pageInfo
    };
  }

  // Otherwise, recursively search through the object properties
  for (const key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      const result = findConnectionInResult(data[key]);
      if (result.edges && result.edges.length > 0) {
        return result;
      }
    }
  }

  return { edges: [], pageInfo: null };
}
