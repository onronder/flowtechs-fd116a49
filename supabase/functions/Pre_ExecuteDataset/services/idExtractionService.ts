
/**
 * Service for extracting IDs from Shopify API results
 */

/**
 * Extract IDs from results using a JSON path
 */
export function extractIds(results: any[], idPath: string): string[] {
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
