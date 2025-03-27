
import { BaseShopifyClient } from '../../../_shared/client.ts';

interface OrdersQueryParams {
  limit: number;
  days: number;
  status: string;
}

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the recent orders query
   */
  async executeRecentOrdersQuery(limit: number = 10, days: number = 30, status: string = 'any'): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Construct the query string based on parameters
    const queryFilter = `created_at:>-${days}d${status !== 'any' ? ` status:${status}` : ''}`;
    
    // Variables for the GraphQL query
    const variables = {
      first: Math.min(limit, 250), // Maximum of 250 per request
      query: queryFilter
    };
    
    try {
      console.log(`Executing Shopify GraphQL query to fetch recent orders`);
      const data = await this.executeQuery(queryString, variables);
      
      // Process the orders data
      const orders = data.orders.edges.map((edge: any) => edge.node);
      const pageInfo = data.orders.pageInfo;
      
      return { orders, pageInfo };
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  }
}
