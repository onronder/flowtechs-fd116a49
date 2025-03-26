
import { load as loadQuery } from './query.graphql.ts';
import { corsHeaders } from '../../../_shared/cors.ts';

/**
 * ShopifyClient for Edge Functions
 */
export class ShopifyClient {
  private storeName: string;
  private accessToken: string;
  private apiVersion: string;
  private endpoint: string;
  
  constructor(storeName: string, accessToken: string, apiVersion: string) {
    this.storeName = storeName;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
    this.endpoint = `https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
  }

  /**
   * Execute the top products query
   */
  async executeTopProductsQuery<T>(): Promise<T> {
    const query = loadQuery;
    const variables = { first: 10 };
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken
        },
        body: JSON.stringify({
          query,
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
      
      return result.data as T;
    } catch (error) {
      console.error('Error executing Shopify GraphQL query:', error);
      throw error;
    }
  }
}
