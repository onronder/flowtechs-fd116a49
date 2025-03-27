
/**
 * Shopify GraphQL client for executing queries with pagination
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
      
      const { responseData, error } = await executeApiRequest(
        endpoint, 
        config.accessToken, 
        paginatedQuery, 
        { first: pageSize, after: after },
        apiCallCount,
        after
      );
      
      if (error) {
        apiErrors.push(error);
        
        // Handle rate limiting
        if (error.status === 429 || (error.graphqlErrors && isRateLimitError(error.graphqlErrors))) {
          console.log("Rate limited, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // If we've already made multiple calls, we might be in a loop
        if (apiCallCount > 3) {
          throw new Error(`Multiple fetch errors: ${JSON.stringify(apiErrors)}`);
        }
        
        // Add delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Extract the nodes and pagination info based on resource type
      const dataPath = getDataPath(resourceType, responseData);
      
      if (!dataPath) {
        const errorDetails = {
          message: `Could not find data for resource type: ${resourceType}`,
          data: JSON.stringify(responseData).substring(0, 200) + "...",
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
 * Execute a single GraphQL API request to Shopify
 */
async function executeApiRequest(
  endpoint: string,
  accessToken: string,
  query: string,
  variables: Record<string, any>,
  apiCallCount: number,
  cursor: string | null
) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        responseData: null,
        error: {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          call: apiCallCount,
          cursor: cursor || "initial"
        }
      };
    }
    
    const responseData = await response.json();
    
    if (responseData.errors && responseData.errors.length > 0) {
      return {
        responseData: null,
        error: {
          graphqlErrors: responseData.errors,
          call: apiCallCount,
          cursor: cursor || "initial"
        }
      };
    }
    
    return { responseData, error: null };
  } catch (fetchError) {
    return {
      responseData: null,
      error: {
        message: fetchError.message || "Network error during fetch",
        call: apiCallCount,
        cursor: cursor || "initial"
      }
    };
  }
}

/**
 * Check if GraphQL errors indicate a rate limit issue
 */
function isRateLimitError(errors: any[]) {
  return errors.some(err => 
    (err.message && (
      err.message.includes("rate limit") || 
      err.message.includes("throttled") || 
      err.message.includes("exceeded")
    )) || 
    (err.extensions && err.extensions.code === "THROTTLED")
  );
}
