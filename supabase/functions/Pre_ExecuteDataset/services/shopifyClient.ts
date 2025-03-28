
/**
 * Shopify client service for making API requests
 */

/**
 * Fetch paginated data from Shopify API
 */
export async function fetchPaginatedData(credentials: any, queryTemplate: string, resourceType: string) {
  // Start tracking time for performance measurement
  const startTime = Date.now();
  
  // Initialize variables for tracking state
  let hasNextPage = true;
  let endCursor: string | null = null;
  let allResults: any[] = [];
  let apiCallCount = 0;
  const apiErrors: any[] = [];
  
  // API endpoint
  const apiVersion = credentials.api_version || "2023-01";
  const endpoint = `https://${credentials.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
  
  console.log(`Using Shopify API endpoint: ${endpoint}`);
  console.log(`Resource type for data path: ${resourceType}`);
  
  // Paginate through all results
  while (hasNextPage) {
    try {
      apiCallCount++;
      
      // Replace placeholders in the query template
      let query = queryTemplate;
      if (endCursor) {
        // If we have a cursor, update the query to use it for pagination
        query = query.replace('"CURSOR_PLACEHOLDER"', `"${endCursor}"`);
      } else {
        // If this is the first request, make sure we use null for the cursor
        query = query.replace('"CURSOR_PLACEHOLDER"', "null");
      }
      
      console.log(`Making Shopify API call #${apiCallCount}, cursor: ${endCursor || 'null'}`);
      
      // Make the GraphQL API call
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": credentials.accessToken,
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify API error (${response.status}): ${errorText}`);
        apiErrors.push({
          status: response.status,
          message: errorText,
          call: apiCallCount,
        });
        throw new Error(`Shopify API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        apiErrors.push({
          errors: result.errors,
          call: apiCallCount,
        });
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }
      
      // Find the right path in the data for our results
      const data = result.data;
      if (!data) {
        console.error("No data in response:", result);
        throw new Error("No data returned from Shopify API");
      }
      
      // Use getDataPath helper to find the correct path for the data
      const dataPath = await import('./shopifyDataPathUtils.ts').then(m => m.getDataPath);
      const items = dataPath(resourceType, data);
      
      if (!items) {
        console.error(`No items found at path for resource type '${resourceType}':`, data);
        throw new Error(`No items found for resource type '${resourceType}'`);
      }
      
      // Handle different pagination structures
      if (items.edges && Array.isArray(items.edges)) {
        // Modern pagination with edges/nodes
        const nodes = items.edges.map((edge: any) => edge.node);
        allResults = [...allResults, ...nodes];
        
        // Update pagination info
        hasNextPage = items.pageInfo && items.pageInfo.hasNextPage;
        endCursor = items.pageInfo && items.pageInfo.endCursor;
      } else if (Array.isArray(items)) {
        // Direct array of items (older API or custom query)
        allResults = [...allResults, ...items];
        
        // No pagination info in this structure, so we're done
        hasNextPage = false;
      } else {
        console.error("Unexpected data structure:", items);
        throw new Error("Unexpected data structure in response");
      }
      
      console.log(`Retrieved ${allResults.length} results so far. hasNextPage: ${hasNextPage}`);
      
      // Add delay to avoid rate limiting (optional)
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error fetching data from Shopify API (call #${apiCallCount}):`, error);
      
      // Add to our error collection
      if (!apiErrors.some(e => e.call === apiCallCount)) {
        apiErrors.push({
          message: error instanceof Error ? error.message : String(error),
          call: apiCallCount,
        });
      }
      
      // Rethrow to stop pagination
      throw error;
    }
  }
  
  // Calculate execution time
  const executionTime = Date.now() - startTime;
  console.log(`Fetched ${allResults.length} total results in ${executionTime}ms with ${apiCallCount} API calls`);
  
  return {
    results: allResults,
    apiCallCount,
    executionTime,
    apiErrors: apiErrors.length > 0 ? apiErrors : null,
  };
}
