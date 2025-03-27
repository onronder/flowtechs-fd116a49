
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the customer acquisition query
   */
  async executeCustomerAcquisitionQuery(months: number = 12): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Calculate the date range based on months parameter
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    const startDate = date.toISOString();
    
    // Variables for the GraphQL query
    const variables = {
      first: 250,
      after: null
    };
    
    try {
      console.log(`Executing Shopify GraphQL query for customer acquisition since ${startDate}`);
      let allCustomers: any[] = [];
      let hasNextPage = true;
      
      // Paginate through all results
      while (hasNextPage) {
        const data = await this.executeQuery(queryString, variables);
        
        if (!data?.customers?.edges) {
          console.error('Unexpected query result format:', data);
          throw new Error('Invalid query result format');
        }
        
        // Extract customers from this page
        const customers = data.customers.edges.map((edge: any) => edge.node);
        allCustomers = [...allCustomers, ...customers];
        
        // Check if there are more pages
        hasNextPage = data.customers.pageInfo.hasNextPage;
        if (hasNextPage) {
          variables.after = data.customers.pageInfo.endCursor;
        }
      }
      
      // Process the data to create monthly timeline
      return this.processAcquisitionData(allCustomers, months, startDate);
    } catch (error) {
      console.error('Error fetching customer acquisition data:', error);
      throw error;
    }
  }
  
  private processAcquisitionData(customers: any[], months: number, startDate: string): any {
    // Generate last X months
    const timeline: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      timeline[monthKey] = 0;
    }
    
    // Count customers by month
    customers.forEach((customer) => {
      if (new Date(customer.createdAt) >= new Date(startDate)) {
        const createdAt = new Date(customer.createdAt);
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (timeline[monthKey] !== undefined) {
          timeline[monthKey]++;
        }
      }
    });
    
    // Convert to array for charts, ordered by date
    const timelineData = Object.entries(timeline)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Calculate first order metrics
    const firstOrderCounts = this.calculateFirstOrderMetrics(customers);
    
    return {
      timeline: timelineData,
      totalCustomers: customers.length,
      firstOrderMetrics: firstOrderCounts
    };
  }
  
  private calculateFirstOrderMetrics(customers: any[]): any {
    // Count customers with/without first order
    let customersWithFirstOrder = 0;
    let totalFirstOrderValue = 0;
    
    customers.forEach((customer) => {
      const hasOrder = customer.orders && 
                      customer.orders.edges && 
                      customer.orders.edges.length > 0;
      
      if (hasOrder) {
        customersWithFirstOrder++;
        
        // Get the order value
        const order = customer.orders.edges[0].node;
        if (order.totalPriceSet && order.totalPriceSet.shopMoney) {
          const orderValue = parseFloat(order.totalPriceSet.shopMoney.amount);
          totalFirstOrderValue += orderValue;
        }
      }
    });
    
    // Calculate average first order value
    const avgFirstOrderValue = customersWithFirstOrder > 0 
      ? (totalFirstOrderValue / customersWithFirstOrder) 
      : 0;
    
    return {
      customersWithFirstOrder,
      customersWithoutFirstOrder: customers.length - customersWithFirstOrder,
      conversionRate: customers.length > 0 
        ? (customersWithFirstOrder / customers.length) * 100 
        : 0,
      averageFirstOrderValue: avgFirstOrderValue
    };
  }
}
