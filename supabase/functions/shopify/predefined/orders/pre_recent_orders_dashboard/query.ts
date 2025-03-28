
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the recent orders query
   */
  async executeRecentOrdersQuery(limit: number = 10, days: number = 30, status: string = 'any'): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Variables for the GraphQL query
    const variables = {
      first: Math.min(limit, 250), // Maximum of 250 per request
      after: null
    };
    
    try {
      console.log(`Executing Shopify GraphQL query for recent orders`);
      
      const data = await this.executeQuery(queryString, variables);
      
      if (!data?.orders?.edges) {
        console.error('Unexpected query result format:', data);
        throw new Error('Invalid query result format');
      }
      
      // Process orders
      const orders = data.orders.edges.map((edge: any) => {
        const order = edge.node;
        return {
          id: order.id,
          name: order.name,
          processedAt: order.processedAt,
          financialStatus: order.displayFinancialStatus,
          fulfillmentStatus: order.displayFulfillmentStatus,
          totalPrice: order.totalPriceSet?.shopMoney 
            ? {
                amount: parseFloat(order.totalPriceSet.shopMoney.amount),
                currencyCode: order.totalPriceSet.shopMoney.currencyCode
              }
            : null,
          customer: order.customer
            ? {
                id: order.customer.id,
                email: order.customer.email,
                name: order.customer.displayName
              }
            : null
        };
      });
      
      // Filter orders by date if days parameter is provided
      let filteredOrders = orders;
      if (days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        filteredOrders = orders.filter((order: any) => {
          return new Date(order.processedAt) >= cutoffDate;
        });
      }
      
      // Filter by status if not 'any'
      if (status !== 'any') {
        filteredOrders = filteredOrders.filter((order: any) => {
          return order.fulfillmentStatus === status || order.financialStatus === status;
        });
      }
      
      // Calculate summary data
      const totalSales = filteredOrders.reduce((total: number, order: any) => {
        return total + (order.totalPrice?.amount || 0);
      }, 0);
      
      const statusCounts: Record<string, number> = {};
      filteredOrders.forEach((order: any) => {
        const status = order.fulfillmentStatus || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      return {
        orders: filteredOrders,
        summary: {
          totalOrders: filteredOrders.length,
          totalSales,
          averageOrderValue: filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0,
          statusCounts
        },
        pageInfo: data.orders.pageInfo
      };
    } catch (error) {
      console.error('Error executing recent orders query:', error);
      throw error;
    }
  }
}
