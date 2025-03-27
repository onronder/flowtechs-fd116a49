
import { BaseShopifyClient } from "../../../../_shared/client.ts";

export interface InventoryProduct {
  id: string;
  title: string;
  status: string;
  totalInventory: number;
  variant: {
    id: string;
    title: string;
    inventoryQuantity: number;
    sku: string;
    inventoryTracked: boolean;
  };
}

export interface InventoryStatusResponse {
  products: InventoryProduct[];
  statistics: {
    total: number;
    statusCounts: {
      outOfStock: number;
      low: number;
      medium: number;
      high: number;
    };
  };
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the inventory status query
   */
  async executeInventoryStatusQuery(
    limit: number = 50,
    cursor?: string
  ): Promise<InventoryStatusResponse> {
    try {
      // Load the query from the .graphql file
      const queryString = await this.loadGraphQLQuery('./query.graphql');
      
      console.log(`Executing inventory status query with limit: ${limit}, cursor: ${cursor || 'none'}`);
      
      // Variables for the GraphQL query
      const variables = {
        first: Math.min(limit, 250), // Maximum of 250 per request
        after: cursor
      };
      
      // Execute the query
      const result = await this.executeQuery<{
        products: {
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string;
          };
          edges: Array<{
            node: {
              id: string;
              title: string;
              status: string;
              totalInventory: number;
              variants: {
                edges: Array<{
                  node: {
                    id: string;
                    title: string;
                    inventoryQuantity: number;
                    sku: string;
                    inventoryItem: {
                      tracked: boolean;
                    };
                  };
                }>;
              };
            };
          }>;
        };
      }>(queryString, variables);
      
      // Extract products with inventory information
      const products = result.products.edges.map(edge => {
        const product = edge.node;
        const firstVariant = product.variants.edges[0]?.node;
        
        return {
          id: product.id,
          title: product.title,
          status: product.status,
          totalInventory: product.totalInventory,
          variant: firstVariant ? {
            id: firstVariant.id,
            title: firstVariant.title,
            inventoryQuantity: firstVariant.inventoryQuantity,
            sku: firstVariant.sku,
            inventoryTracked: firstVariant.inventoryItem?.tracked || false
          } : null
        };
      });
      
      // Count products by inventory status
      const statusCounts = {
        outOfStock: 0,
        low: 0,
        medium: 0,
        high: 0
      };
      
      // Process each product to determine inventory status
      const processedProducts = products.map(product => {
        const inventoryStatus = this.getInventoryStatus(product.totalInventory);
        statusCounts[inventoryStatus as keyof typeof statusCounts]++;
        
        return {
          ...product,
          status: inventoryStatus
        };
      });
      
      return {
        products: processedProducts,
        statistics: {
          total: processedProducts.length,
          statusCounts
        },
        pageInfo: result.products.pageInfo
      };
    } catch (error) {
      console.error('Error executing inventory status query:', error);
      throw error;
    }
  }
  
  private getInventoryStatus(inventory: number): string {
    if (inventory <= 0) return 'outOfStock';
    if (inventory < 5) return 'low';
    if (inventory < 20) return 'medium';
    return 'high';
  }
}
