
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
  if (!shopifyConfig.storeName || !shopifyConfig.accessToken) {
    throw new Error("Missing required Shopify configuration values: storeName and accessToken");
  }

  const api_version = shopifyConfig.api_version || '2023-10';
  const endpoint = `https://${shopifyConfig.storeName}.myshopify.com/admin/api/${api_version}/graphql.json`;
  
  console.log(`Making API call to Shopify endpoint: ${endpoint}`);
  console.log(`Query template: ${queryTemplate.substring(0, 100)}...`);
  console.log(`Variables: ${JSON.stringify(variables)}`);
  
  try {
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
  } catch (error) {
    console.error("Error executing Shopify GraphQL query:", error);
    throw error;
  }
}

/**
 * Fetches paginated data from Shopify API with automatic pagination handling
 */
export async function fetchPaginatedData(
  shopifyConfig: ShopifyConfig, 
  queryTemplate: string, 
  resourceType: string
): Promise<{ results: any[], apiCallCount: number, executionTime: number }> {
  console.log(`Starting paginated data fetch for resource: ${resourceType}`);
  console.log(`Shop: ${shopifyConfig.storeName}, API version: ${shopifyConfig.api_version}`);
  
  const startTime = Date.now();
  let allResults: any[] = [];
  let apiCallCount = 0;
  let hasNextPage = true;
  let cursor = null;

  try {
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
  } catch (error) {
    console.error("Error in fetchPaginatedData:", error);
    throw error;
  }

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  console.log(`Fetch completed in ${executionTime}ms with ${apiCallCount} API calls`);
  console.log(`Total results: ${allResults.length}`);

  return {
    results: allResults,
    apiCallCount,
    executionTime
  };
}
