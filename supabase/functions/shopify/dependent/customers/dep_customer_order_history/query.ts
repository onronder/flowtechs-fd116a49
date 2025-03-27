
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the customer order history query with batch processing
   */
  async executeCustomerOrderHistoryQuery(customerIds: string[]): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Process in batches due to GraphQL complexity limits
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batchIds = customerIds.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} with ${batchIds.length} customer IDs`);
      
      // Variables for the GraphQL query
      const variables = {
        ids: batchIds
      };
      
      try {
        const batchData = await this.executeQuery(queryString, variables);
        results.push(...batchData.nodes.filter(Boolean));
        
        // Small delay to avoid rate limiting
        if (i + batchSize < customerIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        throw error;
      }
    }
    
    return {
      customers: results,
      totalCount: results.length
    };
  }
}
