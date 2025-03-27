
import { BaseShopifyClient } from "../../../../_shared/client.ts";

export interface InventoryProduct {
  id: string;
  title: string;
  vendor: string;
  productType: string;
  totalInventory: number;
  availableForSale: boolean;
  status: string;
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
              vendor: string;
              productType: string;
              totalInventory: number;
              availableForSale: boolean;
              status: string;
            };
          }>;
        };
      }>(queryString, variables);
      
      // Extract products with inventory information
      const products = result.products.edges.map(edge => edge.node);
      
      // Count products by inventory status
      const statusCounts = {
        outOfStock: 0,
        low: 0,
        medium: 0,
        high: 0
      };
      
      // Process each product to determine inventory status
      const processedProducts = products.map(product => {
        const status = this.getInventoryStatus(product.totalInventory);
        statusCounts[status as keyof typeof statusCounts]++;
        
        return {
          ...product,
          status
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
