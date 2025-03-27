
import { corsHeaders } from '../../../_shared/cors.ts';
import { BaseShopifyClient } from '../../../_shared/client.ts';

/**
 * Interface for top products response structure
 */
interface TopProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{
      node: {
        id: string;
        title: string;
        vendor: string;
        status: string;
        totalInventory: number;
        variants: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              price: string;
              inventoryQuantity: number | null;
              sku: string | null;
            }
          }>
        }
      }
    }>
  }
}

/**
 * ShopifyClient for Edge Functions
 */
export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the top products query
   */
  async executeTopProductsQuery(limit: number = 25, cursor: string | null = null): Promise<{
    products: any[];
    pagination: { hasNextPage: boolean; endCursor: string | null };
  }> {
    // Initialize endpoint with proper API version before executing query
    await this.initializeEndpoint();
    
    // Load the query from the .graphql file
    const queryString = await this.loadGraphQLQuery('./query.graphql');
    const variables = { first: limit, after: cursor };
    
    try {
      console.log(`Executing Shopify GraphQL query to fetch top ${limit} products by revenue`);
      
      // Execute the query
      const data = await this.executeQuery<TopProductsResponse>(queryString, variables);
      
      // Transform the response data
      const transformedProducts = data.products.edges.map(edge => {
        const product = edge.node;
        const primaryVariant = product.variants.edges.length > 0 ? product.variants.edges[0].node : null;
        
        return {
          id: product.id,
          title: product.title,
          vendor: product.vendor,
          status: product.status,
          totalInventory: product.totalInventory,
          variant: primaryVariant ? {
            id: primaryVariant.id,
            title: primaryVariant.title,
            price: primaryVariant.price,
            inventoryQuantity: primaryVariant.inventoryQuantity,
            sku: primaryVariant.sku
          } : null
        };
      });
      
      return {
        products: transformedProducts,
        pagination: {
          hasNextPage: data.products.pageInfo.hasNextPage,
          endCursor: data.products.pageInfo.endCursor
        }
      };
    } catch (error) {
      console.error('Error executing Shopify GraphQL query:', error);
      throw error;
    }
  }
}
