
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the inventory status query
   */
  async executeInventoryStatusQuery(limit: number = 50): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Variables for the GraphQL query
    const variables = {
      first: Math.min(limit, 250) // Maximum of 250 per request
    };
    
    try {
      console.log(`Executing Shopify GraphQL query for inventory status`);
      const data = await this.executeQuery(queryString, variables);
      
      // Process the inventory data
      return this.processInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory status:', error);
      throw error;
    }
  }
  
  private processInventoryData(data: any): any {
    // Extract products with inventory information
    const products = data.products.edges.map((edge: any) => {
      const product = edge.node;
      return {
        id: product.id,
        title: product.title,
        vendor: product.vendor,
        productType: product.productType,
        totalInventory: product.totalInventory,
        status: this.getInventoryStatus(product.totalInventory)
      };
    });
    
    // Count products by inventory status
    const statusCounts = {
      outOfStock: 0,
      low: 0,
      medium: 0,
      high: 0
    };
    
    products.forEach((product: any) => {
      statusCounts[product.status as keyof typeof statusCounts]++;
    });
    
    return {
      products,
      statistics: {
        total: products.length,
        statusCounts
      }
    };
  }
  
  private getInventoryStatus(inventory: number): string {
    if (inventory <= 0) return 'outOfStock';
    if (inventory < 5) return 'low';
    if (inventory < 20) return 'medium';
    return 'high';
  }
}
