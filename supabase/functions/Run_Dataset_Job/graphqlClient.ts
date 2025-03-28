
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

export async function executeDependentQueryWithState(
  shop: string, 
  token: string, 
  datasetId: string, 
  primaryQuery: string, 
  secondaryQuery: string,
  idPath: string = "node.id"
): Promise<any[]> {
  console.log(`Executing stateful dependent query for dataset ID: ${datasetId}`);
  
  // Get existing job progress
  const { data: jobProgress, error } = await supabase
    .from("dataset_job_queue")
    .select("*")
    .eq("dataset_id", datasetId)
    .eq("status", "in_progress")
    .maybeSingle();
  
  // Get cursor or other state from the job progress
  let cursor = jobProgress?.metadata?.cursor || null;
  let processedIds = jobProgress?.metadata?.processed_ids || [];
  const allResults = [];
  let hasNextPage = true;
  
  console.log(`Job state: cursor=${cursor}, processed=${processedIds.length} ids`);
  
  try {
    while (hasNextPage) {
      // Replace cursor placeholder in primary query
      const cursorValue = cursor ? `"${cursor}"` : "null";
      const primaryQueryWithCursor = primaryQuery.replace('$after', cursorValue);
      
      // Execute primary query with cursor
      const primaryData = await executeGraphQLQuery(shop, token, primaryQueryWithCursor);
      
      // Extract connection data for pagination
      const connection = findConnectionInData(primaryData);
      if (!connection) {
        console.error("Failed to find connection data in primary query result");
        break;
      }
      
      // Update pagination state
      const pageInfo = connection.pageInfo;
      cursor = pageInfo.endCursor;
      hasNextPage = pageInfo.hasNextPage;
      
      // Extract IDs from current page
      const pageIds = extractIds(primaryData, idPath);
      console.log(`Extracted ${pageIds.length} IDs from current page`);
      
      // Filter out already processed IDs
      const newIds = pageIds.filter(id => !processedIds.includes(id));
      console.log(`Found ${newIds.length} new IDs to process`);
      
      // Process new IDs
      for (const id of newIds) {
        // Replace ID placeholder in secondary query
        const query = secondaryQuery.replace('$id', JSON.stringify(id));
        
        try {
          const result = await executeGraphQLQuery(shop, token, query);
          allResults.push(result);
          processedIds.push(id);
          
          // Update job progress periodically
          if (processedIds.length % 5 === 0 || !hasNextPage) {
            await updateJobProgress(datasetId, cursor, processedIds, hasNextPage);
          }
        } catch (error) {
          console.error(`Error executing secondary query for ID ${id}:`, error);
          // Continue with other IDs even if one fails
        }
      }
      
      console.log(`Page complete. Cursor: ${cursor}, HasNextPage: ${hasNextPage}`);
      
      // If we've processed all items and there's no next page
      if (!hasNextPage) {
        console.log("No more pages to process");
        await updateJobProgress(datasetId, cursor, processedIds, false, 'completed');
        break;
      }
    }
    
    console.log(`Completed dependent query execution. Processed ${allResults.length} results`);
    return allResults;
  } catch (error) {
    // Update job progress with error state
    console.error("Error in executeDependentQueryWithState:", error);
    await updateJobProgress(datasetId, cursor, processedIds, true, 'failed', error.message);
    throw error;
  }
}

// Helper function to update job progress
async function updateJobProgress(
  datasetId: string, 
  cursor: string | null, 
  processedIds: string[], 
  hasNextPage: boolean,
  status = 'in_progress',
  errorMessage?: string
) {
  const { error } = await supabase
    .from("dataset_job_queue")
    .upsert({
      dataset_id: datasetId,
      status: status,
      metadata: {
        cursor,
        processed_ids: processedIds,
        has_next_page: hasNextPage,
        updated_at: new Date().toISOString()
      },
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'dataset_id'
    });
  
  if (error) {
    console.error("Error updating job progress:", error);
  }
}

// Helper function to find connection object in GraphQL response
function findConnectionInData(data: any): { edges: any[], pageInfo: { hasNextPage: boolean, endCursor: string | null } } | null {
  if (!data) return null;
  
  // Search for common connection patterns
  for (const key in data) {
    const value = data[key];
    
    if (value && typeof value === 'object') {
      // Check if this is a connection object with pageInfo
      if (value.edges && Array.isArray(value.edges) && value.pageInfo) {
        return value;
      }
      
      // Check nested objects recursively
      const nestedConnection = findConnectionInData(value);
      if (nestedConnection) {
        return nestedConnection;
      }
    }
  }
  
  return null;
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
