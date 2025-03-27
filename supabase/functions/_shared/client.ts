
/**
 * Base client for Shopify API interactions
 */
export class BaseShopifyClient {
  protected storeName: string;
  protected accessToken: string;
  protected apiVersion: string;
  protected endpoint: string;
  
  constructor(storeName: string, accessToken: string, apiVersion: string = '2025-01') {
    this.storeName = storeName;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion || '2025-01'; // Default to latest version if not provided
    this.endpoint = `https://${storeName}.myshopify.com/admin/api/${this.apiVersion}/graphql.json`;
  }
  
  /**
   * Load a GraphQL query from a file path
   */
  async loadGraphQLQuery(path: string): Promise<string> {
    try {
      const queryPath = new URL(path, import.meta.url);
      const rawQuery = await Deno.readTextFile(queryPath);
      return rawQuery;
    } catch (error) {
      console.error(`Error loading GraphQL query from ${path}:`, error);
      throw new Error(`Failed to load GraphQL query: ${error.message}`);
    }
  }
  
  /**
   * Execute a GraphQL query
   */
  async executeQuery<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
    try {
      // Execute the GraphQL query
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
        const textResponse = await response.text();
        throw new Error(`Shopify API error (${response.status}): ${textResponse}`);
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
