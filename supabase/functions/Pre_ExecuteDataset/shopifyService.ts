
/**
 * Functions to fetch data from Shopify API with pagination support
 */

/**
 * Fetch data with pagination support
 */
export async function fetchPaginatedData(
  sourceConfig: any,
  queryTemplate: string,
  resourceType: string = "products"
) {
  // Start timing the execution
  const startTime = Date.now();
  const allResults = [];
  let apiCallCount = 0;
  let hasNextPage = true;
  let cursor = null;
  
  // Verify required fields in the source config
  if (!sourceConfig.accessToken || !sourceConfig.storeName) {
    throw new Error("Missing required Shopify credentials: accessToken or storeName");
  }
  
  console.log(`Fetching paginated data for resource: ${resourceType}`);
  
  // Configure the Shopify API URL
  const shopifyDomain = `${sourceConfig.storeName}.myshopify.com`;
  const apiVersion = "2024-01"; // Use a fixed recent version
  const baseUrl = `https://${shopifyDomain}/admin/api/${apiVersion}/graphql.json`;
  
  // Process the query template to handle pagination
  if (!queryTemplate.includes("$cursor")) {
    console.warn("Query template does not include $cursor variable, pagination may not work correctly");
  }
  
  try {
    // Loop until all pages are fetched
    while (hasNextPage) {
      // Insert cursor into the query
      let query = queryTemplate;
      if (cursor) {
        // Replace the cursor placeholder properly
        query = query.replace('$cursor: String', `$cursor: String = "${cursor}"`);
      } else {
        // For first page with null cursor
        query = query.replace('$cursor: String', '$cursor: String = null');
      }
      
      console.log(`Executing Shopify API call ${apiCallCount + 1}${cursor ? ' with cursor: ' + cursor : ''}`);
      
      // Make the API call
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": sourceConfig.accessToken
        },
        body: JSON.stringify({ query })
      });
      
      apiCallCount++;
      
      // Check for API errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify API error (${response.status}):`, errorText);
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Check for GraphQL errors
      if (data.errors) {
        console.error("GraphQL errors:", JSON.stringify(data.errors));
        throw new Error(`GraphQL errors: ${data.errors[0].message}`);
      }
      
      // Handle response based on resource type
      const responseData = data.data;
      
      if (!responseData) {
        console.error("Unexpected response format:", JSON.stringify(data));
        throw new Error("Unexpected response format from Shopify API");
      }
      
      // Extract the relevant data and pagination info based on resource type
      let pageInfo = null;
      let results = [];
      
      // Find the first resource in the response that contains pageInfo
      const resourceKey = findResourceKey(responseData, resourceType);
      
      if (!resourceKey) {
        console.error("Could not find resource in response:", JSON.stringify(responseData));
        throw new Error(`Could not find ${resourceType} data in API response`);
      }
      
      const resource = responseData[resourceKey];
      
      if (resource && resource.edges) {
        // Standard GraphQL connection pattern
        results = resource.edges.map((edge: any) => edge.node);
        pageInfo = resource.pageInfo;
      } else if (Array.isArray(resource)) {
        // Direct array of results
        results = resource;
        pageInfo = { hasNextPage: false };
      } else {
        console.error("Unexpected resource format:", JSON.stringify(resource));
        throw new Error(`Unexpected ${resourceType} data format in API response`);
      }
      
      // Add results to the accumulated list
      if (results.length > 0) {
        allResults.push(...results);
        console.log(`Fetched ${results.length} ${resourceType}, total so far: ${allResults.length}`);
      } else {
        console.log(`No ${resourceType} returned in this page`);
      }
      
      // Check for next page
      if (pageInfo && pageInfo.hasNextPage && pageInfo.endCursor) {
        cursor = pageInfo.endCursor;
        console.log(`More pages available, next cursor: ${cursor}`);
      } else {
        hasNextPage = false;
        console.log("No more pages available");
      }
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`Completed data fetch in ${executionTime}ms, total results: ${allResults.length}, API calls: ${apiCallCount}`);
    
    return {
      results: allResults,
      apiCallCount,
      executionTime
    };
  } catch (error) {
    console.error("Error fetching data from Shopify:", error);
    throw error;
  }
}

// Helper function to find the resource key in the response
function findResourceKey(responseData: any, resourceType: string): string | null {
  // Try direct match with the resourceType
  if (responseData[resourceType]) {
    return resourceType;
  }
  
  // Try common suffixes
  const suffixes = ['Connection', 's', 'List', 'Collection'];
  for (const suffix of suffixes) {
    const key = resourceType + suffix;
    if (responseData[key]) {
      return key;
    }
  }
  
  // Try looking for the first key that might contain edges/pageInfo structure
  for (const key of Object.keys(responseData)) {
    if (responseData[key] && 
        (responseData[key].edges || 
         responseData[key].pageInfo || 
         Array.isArray(responseData[key]))) {
      return key;
    }
  }
  
  return null;
}
