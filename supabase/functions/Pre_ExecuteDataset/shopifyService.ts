
// Helper functions for Shopify API interactions
import { corsHeaders } from "../_shared/cors.ts";

export interface ShopifyConfig {
  storeName: string;
  api_version: string;
  apiSecret: string;
  accessToken: string;
}

export interface QueryOptions {
  first?: number;
  after?: string | null;
}

/**
 * Executes a GraphQL query against the Shopify API
 */
export async function executeShopifyQuery(
  shopifyConfig: ShopifyConfig,
  queryTemplate: string,
  variables: QueryOptions
): Promise<any> {
  if (!shopifyConfig.storeName || !shopifyConfig.api_version || !shopifyConfig.accessToken || !shopifyConfig.apiSecret) {
    throw new Error("Missing Shopify configuration values");
  }

  const endpoint = `https://${shopifyConfig.storeName}.myshopify.com/admin/api/${shopifyConfig.api_version || '2023-10'}/graphql.json`;
  
  console.log(`Making API call to Shopify endpoint: ${endpoint}`);
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": shopifyConfig.accessToken
    },
    body: JSON.stringify({
      query: queryTemplate,
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

  return result;
}

/**
 * Fetches paginated data from Shopify API with automatic pagination handling
 */
export async function fetchPaginatedData(
  shopifyConfig: ShopifyConfig, 
  queryTemplate: string, 
  resourceType: string
): Promise<{ results: any[], apiCallCount: number, executionTime: number }> {
  const startTime = Date.now();
  let allResults: any[] = [];
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

    const result = await executeShopifyQuery(shopifyConfig, queryTemplate, variables);
    
    // Extract the results
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

  return {
    results: allResults,
    apiCallCount,
    executionTime
  };
}
