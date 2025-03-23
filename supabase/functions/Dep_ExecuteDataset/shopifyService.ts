
/**
 * Execute a Shopify GraphQL query with tracking
 */
export async function executeShopifyQuery(
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

/**
 * Extract IDs from results using a JSON path
 */
export function extractIds(results: any[], idPath: string) {
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

/**
 * Execute secondary queries with batched IDs
 */
export async function executeSecondaryQueries(
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
