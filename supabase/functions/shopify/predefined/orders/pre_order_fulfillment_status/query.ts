
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the order fulfillment status query
   */
  async executeFulfillmentStatusQuery(days: number = 30): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Variables for the GraphQL query
    const variables = {
      query: `created_at:>-${days}d`,
      first: 250
    };
    
    try {
      console.log(`Executing Shopify GraphQL query for fulfillment status`);
      const data = await this.executeQuery(queryString, variables);
      
      // Process the data
      return this.processFulfillmentData(data);
    } catch (error) {
      console.error('Error fetching fulfillment status:', error);
      throw error;
    }
  }
  
  private processFulfillmentData(data: any): any {
    // Extract orders
    const orders = data.orders.edges.map((edge: any) => edge.node);
    
    // Count orders by fulfillment status
    const statusCounts: Record<string, number> = {};
    orders.forEach((order: any) => {
      const status = order.displayFulfillmentStatus;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    // Convert to array format for charts
    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    return {
      statusData,
      totalOrders: orders.length
    };
  }
}
