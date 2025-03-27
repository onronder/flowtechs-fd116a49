
/**
 * Utilities for working with Shopify API data paths
 */

/**
 * Helper function to find the correct data path in the response
 */
export function getDataPath(resourceType: string, data: any): any {
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
