
export async function executeGraphQLQuery(shop: string, token: string, query: string): Promise<any> {
  console.log(`Executing GraphQL query against ${shop}`);
  
  try {
    const endpoint = `https://${shop}.myshopify.com/admin/api/2023-04/graphql.json`;
    console.log(`GraphQL endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GraphQL request failed with status ${response.status}: ${errorText}`);
      throw new Error(`GraphQL request failed with status ${response.status}: ${errorText}`);
    }
    
    const json = await response.json();
    
    if (json.errors) {
      console.error("GraphQL errors:", json.errors);
      throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
    }
    
    return json.data;
  } catch (error) {
    console.error("Error executing GraphQL query:", error);
    throw error;
  }
}

export async function executeDependentQuery(
  shop: string, 
  token: string, 
  primaryQuery: string, 
  secondaryQuery: string,
  idPath: string = "node.id"
): Promise<any[]> {
  console.log("Executing dependent query flow");
  
  // Execute primary query to get IDs
  const primaryData = await executeGraphQLQuery(shop, token, primaryQuery);
  console.log("Primary query executed successfully");
  
  // Extract IDs from the primary response
  const ids = extractIds(primaryData, idPath);
  console.log(`Extracted ${ids.length} IDs for secondary queries`);
  
  if (ids.length === 0) {
    console.warn("No IDs found in primary response");
    return [];
  }
  
  // Execute secondary queries for each ID
  const results = [];
  let processedCount = 0;
  
  for (const id of ids) {
    // Replace the ID placeholder in the secondary query
    const query = secondaryQuery.replace('$id', JSON.stringify(id));
    
    try {
      const result = await executeGraphQLQuery(shop, token, query);
      results.push(result);
      processedCount++;
      
      // Log progress periodically
      if (processedCount % 10 === 0 || processedCount === ids.length) {
        console.log(`Processed ${processedCount}/${ids.length} secondary queries`);
      }
      
      // Add a small delay to avoid rate limiting
      if (ids.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error executing secondary query for ID ${id}:`, error);
      // Continue with other IDs even if one fails
    }
  }
  
  console.log(`Completed dependent query execution. Processed ${results.length} results`);
  return results;
}

// Helper function to extract IDs from the primary query response
function extractIds(data: any, idPath: string = "node.id"): string[] {
  console.log("Extracting IDs using path:", idPath);
  
  if (!data) {
    return [];
  }
  
  const pathParts = idPath.split('.');
  const ids: string[] = [];
  
  // Handle common GraphQL pagination patterns
  for (const key in data) {
    const value = data[key];
    
    if (!value) continue;
    
    // Check for edges pattern
    if (value.edges && Array.isArray(value.edges)) {
      value.edges.forEach((edge: any) => {
        const id = getValueByPath(edge, pathParts);
        if (id) ids.push(id);
      });
      
      if (ids.length > 0) {
        console.log(`Found ${ids.length} IDs in ${key}.edges`);
        return ids;
      }
    }
    
    // Check for nodes pattern
    if (value.nodes && Array.isArray(value.nodes)) {
      value.nodes.forEach((node: any) => {
        const id = getValueByPath(node, pathParts.slice(1)); // Skip 'node' in the path
        if (id) ids.push(id);
      });
      
      if (ids.length > 0) {
        console.log(`Found ${ids.length} IDs in ${key}.nodes`);
        return ids;
      }
    }
    
    // Check for direct array
    if (Array.isArray(value)) {
      value.forEach((item: any) => {
        const id = getValueByPath(item, pathParts);
        if (id) ids.push(id);
      });
      
      if (ids.length > 0) {
        console.log(`Found ${ids.length} IDs in ${key} array`);
        return ids;
      }
    }
    
    // Check for nested objects one level down
    if (typeof value === 'object') {
      for (const subKey in value) {
        const subValue = value[subKey];
        
        if (subValue && Array.isArray(subValue)) {
          subValue.forEach((item: any) => {
            const id = getValueByPath(item, pathParts);
            if (id) ids.push(id);
          });
        }
        
        if (subValue && subValue.edges && Array.isArray(subValue.edges)) {
          subValue.edges.forEach((edge: any) => {
            const id = getValueByPath(edge, pathParts);
            if (id) ids.push(id);
          });
        }
        
        if (subValue && subValue.nodes && Array.isArray(subValue.nodes)) {
          subValue.nodes.forEach((node: any) => {
            const id = getValueByPath(node, pathParts.slice(1)); // Skip 'node' in the path
            if (id) ids.push(id);
          });
        }
      }
      
      if (ids.length > 0) {
        console.log(`Found ${ids.length} IDs in nested objects`);
        return ids;
      }
    }
  }
  
  console.log(`Found ${ids.length} total IDs`);
  return ids;
}

// Helper function to get a value from an object using a path
function getValueByPath(obj: any, pathParts: string[]): string | null {
  let current = obj;
  
  for (const part of pathParts) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = current[part];
  }
  
  return typeof current === 'string' ? current : null;
}
