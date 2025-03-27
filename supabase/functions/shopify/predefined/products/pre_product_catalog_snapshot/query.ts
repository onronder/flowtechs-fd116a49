
import { BaseShopifyClient } from '../../../_shared/client.ts';

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the product catalog query
   */
  async executeProductCatalogQuery(limit: number = 50): Promise<any> {
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    
    // Variables for the GraphQL query
    const variables = {
      first: Math.min(limit, 250) // Maximum of 250 per request
    };
    
    try {
      console.log(`Executing Shopify GraphQL query to fetch product catalog`);
      const data = await this.executeQuery(queryString, variables);
      
      // Process the products data
      const products = data.products.edges.map((edge: any) => {
        const product = edge.node;
        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          vendor: product.vendor,
          productType: product.productType,
          totalInventory: product.totalInventory,
          totalVariants: product.totalVariants,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          priceRange: product.priceRangeV2 ? {
            min: product.priceRangeV2.minVariantPrice,
            max: product.priceRangeV2.maxVariantPrice
          } : null
        };
      });
      
      return {
        products,
        pageInfo: data.products.pageInfo,
        totalCount: products.length
      };
    } catch (error) {
      console.error('Error fetching product catalog:', error);
      throw error;
    }
  }
}
