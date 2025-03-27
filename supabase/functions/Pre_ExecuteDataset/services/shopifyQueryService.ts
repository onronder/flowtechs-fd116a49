
/**
 * Service for executing secondary queries against the Shopify API
 */

/**
 * Execute secondary queries with batched IDs
 */
export async function executeSecondaryQueries(
  credentials: any,
  queryTemplate: string,
  ids: string[],
  trackApiCall: (results: any) => any
): Promise<any[]> {
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
