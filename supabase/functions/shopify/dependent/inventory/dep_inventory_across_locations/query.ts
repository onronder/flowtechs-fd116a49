
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the inventory across locations query with batch processing
   */
  async executeInventoryAcrossLocationsQuery(productIds: string[]): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // First, get the locations
    const locationsData = await this.getLocations();
    const locations = locationsData.locations.edges.map((edge: any) => edge.node);
    
    // Process product IDs in batches due to GraphQL complexity limits
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batchIds = productIds.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} with ${batchIds.length} product IDs`);
      
      // Variables for the GraphQL query
      const variables = {
        ids: batchIds
      };
      
      try {
        const batchData = await this.executeQuery(queryString, variables);
        results.push(...batchData.nodes.filter(Boolean));
        
        // Small delay to avoid rate limiting
        if (i + batchSize < productIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        throw error;
      }
    }
    
    return {
      products: results,
      locations,
      totalCount: results.length
    };
  }
  
  /**
   * Get all locations
   */
  private async getLocations(): Promise<any> {
    const queryString = `
      query GetLocations {
        locations(first: 50) {
          edges {
            node {
              id
              name
              address {
                formatted
                country
                city
              }
              isActive
            }
          }
        }
      }
    `;
    
    return await this.executeQuery(queryString);
  }
}
