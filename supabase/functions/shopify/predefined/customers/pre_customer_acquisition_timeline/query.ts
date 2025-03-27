
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the customer acquisition query
   */
  async executeCustomerAcquisitionQuery(months: number = 12): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    const startDate = date.toISOString().split('T')[0];
    
    // Variables for the GraphQL query
    const variables = {
      query: `created_at:>=${startDate}`,
      first: 250
    };
    
    try {
      console.log(`Executing Shopify GraphQL query for customer acquisition since ${startDate}`);
      const data = await this.executeQuery(queryString, variables);
      
      // Process the data to create monthly timeline
      return this.processAcquisitionData(data, months);
    } catch (error) {
      console.error('Error fetching customer acquisition data:', error);
      throw error;
    }
  }
  
  private processAcquisitionData(data: any, months: number): any {
    // Extract customers
    const customers = data.customers.edges.map((edge: any) => edge.node);
    
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
    customers.forEach((customer: any) => {
      const createdAt = new Date(customer.createdAt);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (timeline[monthKey] !== undefined) {
        timeline[monthKey]++;
      }
    });
    
    // Convert to array for charts, ordered by date
    const timelineData = Object.entries(timeline)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    return {
      timeline: timelineData,
      totalCustomers: customers.length
    };
  }
}
