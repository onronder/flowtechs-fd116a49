
import { DocumentNode } from 'graphql';
import { gql } from 'https://esm.sh/graphql-request@6.1.0';

export const ORDER_FULFILLMENT_QUERY = gql`
query PreOrderFulfillmentStatus($first: Int!, $after: String) {
  orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        name
        processedAt
        displayFulfillmentStatus
        shippingAddress {
          name
          address1
          city
          country
          zip
        }
        fulfillments(first: 5) {
          trackingInfo {
            number
            url
            company
          }
          status
          estimatedDeliveryAt
          deliveredAt
        }
      }
    }
  }
}
`;

export class ShopifyClient {
  private storeName: string;
  private accessToken: string;
  private apiVersion: string;
  
  constructor(storeName: string, accessToken: string, apiVersion: string = '2023-10') {
    this.storeName = storeName;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion || '2023-10';
  }
  
  async executeFulfillmentStatusQuery(limit: number = 25): Promise<any> {
    const variables = {
      first: limit,
      after: null
    };
    
    try {
      const endpoint = `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/graphql.json`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken
        },
        body: JSON.stringify({
          query: ORDER_FULFILLMENT_QUERY,
          variables
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }
      
      return this.processFulfillmentData(result.data);
    } catch (error) {
      console.error('Error executing fulfillment status query:', error);
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
              url: info.url,
              company: info.company
            }))
          : [];
          
        return {
          status: fulfillment.status,
          trackingInfo,
          estimatedDeliveryAt: fulfillment.estimatedDeliveryAt,
          deliveredAt: fulfillment.deliveredAt
        };
      }) : [];
      
      return {
        id: order.id,
        name: order.name,
        processedAt: order.processedAt,
        fulfillmentStatus: order.displayFulfillmentStatus,
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
