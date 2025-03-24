
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
  let apiErrors: any[] = [];
  
  try {
    // Set up the Shopify GraphQL endpoint
    const shopifyApiVersion = config.apiVersion || config.api_version || '2022-04';
    const endpoint = `https://${config.storeName}.myshopify.com/admin/api/${shopifyApiVersion}/graphql.json`;
    
    console.log(`Using Shopify endpoint: ${endpoint}`);
    
    // Initialize pagination variables
    let hasNextPage = true;
    let after = null;
    const pageSize = 50; // Reasonable page size for most resources
    
    // Ensure the query has proper variable declarations
    let normalizedQuery = queryTemplate;
    
    // Check if query already has variable declarations
    if (!normalizedQuery.includes('$first:')) {
      // Add variable declarations if not present
      normalizedQuery = normalizedQuery.replace(
        /query\s*{/i, 
        `query($first: Int!, $after: String) {`
      );
    }
    
    // Ensure the first pagination parameter is properly set in the query
    const containsFirstParameter = /(first:\s*\$first|first:\s*\d+)/i.test(normalizedQuery);
    
    while (hasNextPage) {
      apiCallCount++;
      
      // Prepare the query with pagination parameters
      let paginatedQuery = normalizedQuery;
      
      // Replace pagination variables in the query if not properly set
      if (!containsFirstParameter) {
        // Look for places to inject the first parameter by finding entities that might need it
        // This is a simplified approach - in a production system, you'd want more robust parsing
        paginatedQuery = paginatedQuery.replace(
          /(\w+)\s*\(/g,
          (match, entity) => {
            // Only add first parameter to the main entities (not nested fields)
            if (
              entity.toLowerCase().includes('product') || 
              entity.toLowerCase().includes('order') || 
              entity.toLowerCase().includes('customer') || 
              entity.toLowerCase().includes('collection') ||
              entity.toLowerCase() === resourceType.toLowerCase() ||
              entity.toLowerCase() === `${resourceType.toLowerCase()}s`
            ) {
              return `${entity}(first: $first${after ? ', after: $after' : ''}`;
            }
            return match;
          }
        );
      } else if (after) {
        // If first is already in the query, just add after if needed
        paginatedQuery = paginatedQuery.replace(
          /(first:\s*\$first|first:\s*\d+)/i,
          `$1, after: $after`
        );
      }
      
      console.log(`Making API call #${apiCallCount} with cursor: ${after || 'initial'}`);
      
      // Make the API request to Shopify
      let response;
      try {
        response = await fetch(endpoint, {
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
      } catch (fetchError) {
        const errorDetails = {
          message: fetchError.message || "Network error during fetch",
          call: apiCallCount,
          cursor: after || "initial"
        };
        apiErrors.push(errorDetails);
        console.error("Fetch error:", errorDetails);
        
        // Try to continue with next page if possible
        if (apiCallCount > 3) {
          // If we've already made multiple calls, we might be in a loop
          throw new Error(`Multiple fetch errors: ${JSON.stringify(apiErrors)}`);
        }
        
        // Add delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          call: apiCallCount,
          cursor: after || "initial"
        };
        apiErrors.push(errorDetails);
        console.error("API error response:", errorDetails);
        
        if (response.status === 429) {
          // Rate limited - wait and retry
          console.log("Rate limited, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        throw new Error(`Shopify API error: ${response.status} ${errorText}`);
      }
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        const errorDetails = {
          message: "Failed to parse JSON response",
          error: jsonError.message,
          call: apiCallCount,
          cursor: after || "initial"
        };
        apiErrors.push(errorDetails);
        console.error("JSON parsing error:", errorDetails);
        throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
      }
      
      if (responseData.errors && responseData.errors.length > 0) {
        const errorDetails = {
          graphqlErrors: responseData.errors,
          call: apiCallCount,
          cursor: after || "initial"
        };
        apiErrors.push(errorDetails);
        console.error("GraphQL errors:", errorDetails);
        
        // Check if this is a rate limit or throttling issue
        const isRateLimitError = responseData.errors.some(err => 
          (err.message && (
            err.message.includes("rate limit") || 
            err.message.includes("throttled") || 
            err.message.includes("exceeded")
          )) || 
          (err.extensions && err.extensions.code === "THROTTLED")
        );
        
        if (isRateLimitError) {
          console.log("Rate limit or throttling detected, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        throw new Error(`GraphQL error: ${JSON.stringify(responseData.errors)}`);
      }
      
      // Extract the nodes and pagination info based on resource type
      const dataPath = getDataPath(resourceType, responseData.data);
      
      if (!dataPath) {
        const errorDetails = {
          message: `Could not find data for resource type: ${resourceType}`,
          data: JSON.stringify(responseData.data).substring(0, 200) + "...",
          call: apiCallCount,
          cursor: after || "initial"
        };
        apiErrors.push(errorDetails);
        console.error(errorDetails);
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
      executionTime,
      apiErrors: apiErrors.length > 0 ? apiErrors : null
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
