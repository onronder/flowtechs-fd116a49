
import { DocumentNode, print } from 'graphql';
import { parseGql } from '../graphql/queryLoader';

/**
 * Shopify GraphQL client for executing queries
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
   * Execute a GraphQL query from a .graphql file content
   */
  async executeQueryFromFile<T = any>(
    queryFileContent: string,
    variables: Record<string, any> = {}
  ): Promise<T> {
    const parsedQuery = parseGql(queryFileContent);
    return this.executeQuery<T>(parsedQuery, variables);
  }
  
  /**
   * Execute a GraphQL query using a DocumentNode
   */
  async executeQuery<T = any>(
    query: DocumentNode,
    variables: Record<string, any> = {}
  ): Promise<T> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken
        },
        body: JSON.stringify({
          query: print(query),
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
  
  /**
   * Execute a GraphQL query from a string
   */
  async executeQueryString<T = any>(
    queryString: string,
    variables: Record<string, any> = {}
  ): Promise<T> {
    const parsedQuery = parseGql(queryString);
    return this.executeQuery<T>(parsedQuery, variables);
  }
}

/**
 * Create a Shopify client instance
 */
export function createShopifyClient(
  storeName: string, 
  accessToken: string, 
  apiVersion: string
): ShopifyClient {
  return new ShopifyClient(storeName, accessToken, apiVersion);
}
