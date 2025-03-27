
import { corsHeaders } from '../../../_shared/cors.ts';
import { readFileSync } from 'fs';
import { gql } from 'https://esm.sh/graphql-tag@2.12.6';
import { join } from 'path';

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
   * Load and parse the GraphQL query
   */
  private loadGraphQLQuery(): string {
    try {
      // Path is relative to the location of this file
      const queryPath = join(import.meta.dirname, 'query.graphql');
      const queryContent = readFileSync(queryPath, 'utf-8');
      return queryContent;
    } catch (error) {
      console.error('Error loading GraphQL query:', error);
      throw new Error(`Failed to load GraphQL query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute the top products query
   */
  async executeTopProductsQuery<T>(limit: number = 10): Promise<T> {
    const queryString = this.loadGraphQLQuery();
    const query = gql`${queryString}`;
    const variables = { first: limit };
    
    try {
      console.log(`Executing Shopify GraphQL query to fetch top ${limit} products by revenue`);
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken
        },
        body: JSON.stringify({
          query: queryString, // Send as string since we're in Deno environment
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
