
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the product media and images query with batch processing
   */
  async executeProductMediaQuery(productIds: string[]): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Process in batches due to GraphQL complexity limits
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
        results.push(...batchData.nodes.filter(Boolean).map(product => {
          // Extract media from the product
          return {
            id: product.id,
            title: product.title,
            images: product.images?.edges?.map(edge => edge.node) || [],
            media: product.media?.edges?.map(edge => edge.node) || []
          };
        }));
        
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
      totalCount: results.length
    };
  }
  
  /**
   * Fetch product IDs using the primary query
   */
  async fetchProductIds(limit: number = 25, cursor: string | null = null): Promise<any> {
    // Load the primary query
    const primaryQueryString = await this.loadGraphQLQuery('./primary.graphql');
    
    // Variables for the primary query
    const variables = {
      first: limit,
      after: cursor
    };
    
    try {
      console.log(`Fetching up to ${limit} products${cursor ? ' after cursor' : ''}`);
      const data = await this.executeQuery(primaryQueryString, variables);
      
      const products = data.products.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title
      }));
      
      return {
        products,
        pageInfo: data.products.pageInfo
      };
    } catch (error) {
      console.error('Error fetching product IDs:', error);
      throw error;
    }
  }
}
