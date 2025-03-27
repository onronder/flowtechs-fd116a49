
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the order line items query with batch processing
   */
  async executeOrderLineItemsQuery(orderIds: string[]): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Process in batches due to GraphQL complexity limits
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batchIds = orderIds.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} with ${batchIds.length} order IDs`);
      
      // Variables for the GraphQL query
      const variables = {
        ids: batchIds
      };
      
      try {
        const batchData = await this.executeQuery(queryString, variables);
        results.push(...batchData.nodes.filter(Boolean));
        
        // Small delay to avoid rate limiting
        if (i + batchSize < orderIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        throw error;
      }
    }
    
    return {
      orders: results,
      totalCount: results.length
    };
  }
}
