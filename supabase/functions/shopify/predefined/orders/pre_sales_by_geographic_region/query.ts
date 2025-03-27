
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the sales by geographic region query
   */
  async executeGeographicSalesQuery(limit: number = 25): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Variables for the GraphQL query
    const variables = {
      first: limit,
      after: null
    };
    
    try {
      console.log(`Executing Shopify GraphQL query for geographic sales with limit: ${limit}`);
      const data = await this.executeQuery(queryString, variables);
      
      // Process the data
      return this.processGeographicSalesData(data);
    } catch (error) {
      console.error('Error fetching geographic sales data:', error);
      throw error;
    }
  }
  
  /**
   * Process the raw geographic sales data into a more usable format
   */
  private processGeographicSalesData(data: any): any {
    if (!data || !data.orders || !data.orders.edges) {
      console.warn('Received invalid or empty data from Shopify API');
      return { orders: [], meta: { totalOrders: 0, apiCallCount: 1 } };
    }
    
    // Extract orders
    const orders = data.orders.edges.map((edge: any) => {
      const order = edge.node;
      
      return {
        id: order.id,
        name: order.name,
        processedAt: order.processedAt,
        totalPrice: order.totalPriceSet?.shopMoney?.amount 
          ? {
              amount: parseFloat(order.totalPriceSet.shopMoney.amount),
              currencyCode: order.totalPriceSet.shopMoney.currencyCode
            }
          : null,
        shippingAddress: order.shippingAddress 
          ? {
              country: order.shippingAddress.country,
              province: order.shippingAddress.province,
              city: order.shippingAddress.city,
              zip: order.shippingAddress.zip
            }
          : null
      };
    });
    
    // Group orders by geography for easier analysis
    const countryData: Record<string, number> = {};
    const provinceData: Record<string, number> = {};
    const cityData: Record<string, number> = {};
    
    orders.forEach((order: any) => {
      if (order.shippingAddress) {
        // Count orders by country
        const country = order.shippingAddress.country;
        if (country) {
          countryData[country] = (countryData[country] || 0) + 1;
        }
        
        // Count orders by province/state
        const province = order.shippingAddress.province;
        if (province) {
          provinceData[province] = (provinceData[province] || 0) + 1;
        }
        
        // Count orders by city
        const city = order.shippingAddress.city;
        if (city) {
          cityData[city] = (cityData[city] || 0) + 1;
        }
      }
    });
    
    // Build response
    return {
      orders,
      geographicStats: {
        countries: countryData,
        provinces: provinceData,
        cities: cityData
      },
      meta: {
        totalOrders: orders.length,
        apiCallCount: 1,
        pageInfo: data.orders.pageInfo
      }
    };
  }
}
