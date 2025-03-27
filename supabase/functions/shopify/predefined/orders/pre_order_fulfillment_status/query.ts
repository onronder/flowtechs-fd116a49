
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the order fulfillment status query
   */
  async executeFulfillmentStatusQuery(limit: number = 25): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Variables for the GraphQL query
    const variables = {
      first: limit,
      after: null
    };
    
    try {
      console.log(`Executing Shopify GraphQL query for fulfillment status with limit: ${limit}`);
      const data = await this.executeQuery(queryString, variables);
      
      // Process the data
      return this.processFulfillmentData(data);
    } catch (error) {
      console.error('Error fetching fulfillment status:', error);
      throw error;
    }
  }
  
  /**
   * Process the raw fulfillment status data into a more usable format
   */
  private processFulfillmentData(data: any): any {
    if (!data || !data.orders || !data.orders.edges) {
      console.warn('Received invalid or empty data from Shopify API');
      return { orders: [], meta: { totalOrders: 0, apiCallCount: 1 } };
    }
    
    // Extract orders
    const orders = data.orders.edges.map((edge: any) => {
      const order = edge.node;
      
      // Process fulfillments to make them more accessible
      const processedFulfillments = order.fulfillments ? order.fulfillments.map((fulfillment: any) => {
        // Extract tracking information in a more accessible format
        const trackingInfo = fulfillment.trackingInfo && fulfillment.trackingInfo.length > 0 
          ? fulfillment.trackingInfo.map((info: any) => ({
              number: info.number,
              url: info.url
            }))
          : [];
          
        return {
          status: fulfillment.status,
          trackingCompany: fulfillment.trackingCompany,
          trackingInfo,
          estimatedDeliveryAt: fulfillment.estimatedDeliveryAt,
          deliveredAt: fulfillment.deliveredAt
        };
      }) : [];
      
      return {
        id: order.id,
        name: order.name,
        processedAt: order.processedAt,
        fulfillmentStatus: order.fulfillmentStatus,
        shippingAddress: order.shippingAddress,
        fulfillments: processedFulfillments
      };
    });
    
    // Count orders by fulfillment status
    const statusCounts: Record<string, number> = {};
    orders.forEach((order: any) => {
      const status = order.fulfillmentStatus || 'UNFULFILLED';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    // Build response
    return {
      orders,
      statusCounts,
      meta: {
        totalOrders: orders.length,
        apiCallCount: 1,
        pageInfo: data.orders.pageInfo
      }
    };
  }
}
