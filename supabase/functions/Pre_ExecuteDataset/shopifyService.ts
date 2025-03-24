
/**
 * Service functions for Shopify API interactions
 */

/**
 * Fetches data with pagination from Shopify API
 */
export async function fetchPaginatedData(
  config: any,
  queryTemplate: string,
  resourceType: string = "Product"
) {
  console.log(`Fetching data for resource type: ${resourceType}`);
  console.log(`Using config:`, JSON.stringify({
    storeName: config.storeName,
    apiVersion: config.apiVersion || '2022-04'
  }));
  
  // Track API call metrics
  const startTime = Date.now();
  let apiCallCount = 0;
  let results: any[] = [];
  
  try {
    // Set up the Shopify GraphQL endpoint
    const shopifyApiVersion = config.apiVersion || '2022-04';
    const endpoint = `https://${config.storeName}.myshopify.com/admin/api/${shopifyApiVersion}/graphql.json`;
    
    console.log(`Using Shopify endpoint: ${endpoint}`);
    
    // Initialize pagination variables
    let hasNextPage = true;
    let after = null;
    const pageSize = 50; // Reasonable page size for most resources
    
    while (hasNextPage) {
      apiCallCount++;
      
      // Replace pagination variables in the query
      let paginatedQuery = queryTemplate
        .replace(/\$first: Int/, `$first: Int = ${pageSize}`)
        .replace(/\$after: String/, `$after: String = ${after ? `"${after}"` : "null"}`);
      
      console.log(`Making API call #${apiCallCount} with cursor: ${after || 'initial'}`);
      
      // Make the API request to Shopify
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': config.accessToken
        },
        body: JSON.stringify({
          query: paginatedQuery,
          variables: {
            first: pageSize,
            after: after
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (responseData.errors && responseData.errors.length > 0) {
        console.error("GraphQL errors:", responseData.errors);
        throw new Error(`GraphQL error: ${responseData.errors[0].message}`);
      }
      
      // Extract the nodes and pagination info based on resource type
      const dataPath = getDataPath(resourceType, responseData.data);
      
      if (!dataPath) {
        console.error("Could not find data for resource type:", resourceType);
        console.log("Response data:", JSON.stringify(responseData.data));
        throw new Error(`No data found for resource type: ${resourceType}`);
      }
      
      const edges = dataPath.edges || [];
      const nodes = edges.map((edge: any) => edge.node);
      
      console.log(`Retrieved ${nodes.length} nodes in this batch`);
      
      // Add the nodes to our results
      results = [...results, ...nodes];
      
      // Check if there's another page
      hasNextPage = dataPath.pageInfo?.hasNextPage || false;
      after = dataPath.pageInfo?.endCursor || null;
      
      if (hasNextPage) {
        console.log(`Has next page, cursor: ${after}`);
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`Finished fetching data: ${results.length} total records, ${apiCallCount} API calls, ${executionTime}ms`);
    
    return { 
      results, 
      apiCallCount, 
      executionTime 
    };
  } catch (error) {
    console.error("Error fetching data from Shopify:", error);
    throw error;
  }
}

/**
 * Helper function to find the correct data path in the response
 */
function getDataPath(resourceType: string, data: any): any {
  if (!data) return null;
  
  // Common Shopify resource paths
  const resourcePaths: Record<string, string[]> = {
    'Product': ['products'],
    'Customer': ['customers'],
    'Order': ['orders'],
    'Collection': ['collections'],
    'Inventory': ['inventoryItems'],
    'InventoryLevel': ['inventoryLevels']
  };
  
  // Get the path for this resource type
  const paths = resourcePaths[resourceType] || [resourceType.toLowerCase() + 's'];
  
  // Try each possible path
  for (const path of paths) {
    if (data[path]) {
      return data[path];
    }
  }
  
  // If not found, try to find any path with edges and pageInfo
  for (const key in data) {
    if (data[key] && data[key].edges && data[key].pageInfo) {
      return data[key];
    }
  }
  
  return null;
}
