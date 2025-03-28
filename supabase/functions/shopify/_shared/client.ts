
import { corsHeaders } from "./cors.ts";

/**
 * Base Shopify client for Edge Functions
 */
export class BaseShopifyClient {
  protected storeName: string;
  protected accessToken: string;
  protected apiVersion: string;
  protected endpoint: string | null = null;

  constructor(storeName: string, accessToken: string, apiVersion?: string) {
    this.storeName = storeName;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion || "2023-01"; // Default API version if not specified
  }

  /**
   * Initialize the endpoint URL with proper API version
   */
  async initializeEndpoint(): Promise<void> {
    if (this.endpoint) return;
    
    const apiVersion = this.apiVersion;
    this.endpoint = `https://${this.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    console.log(`Initialized Shopify endpoint: ${this.endpoint}`);
  }

  /**
   * Execute a GraphQL query
   */
  async executeQuery<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
    // Make sure endpoint is initialized
    await this.initializeEndpoint();
    
    try {
      console.log(`Executing Shopify GraphQL query with variables:`, JSON.stringify(variables));
      
      const response = await fetch(this.endpoint!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Shopify API error (${response.status}):`, errorText);
        throw new Error(`Shopify API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error("GraphQL errors:", JSON.stringify(result.errors));
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }
      
      return result.data as T;
    } catch (error) {
      console.error("Error executing Shopify GraphQL query:", error);
      throw error;
    }
  }

  /**
   * Load a GraphQL query from a file
   */
  async loadGraphQLQuery(filePath: string): Promise<string> {
    try {
      const queryFile = await Deno.readTextFile(filePath);
      return queryFile;
    } catch (error) {
      console.error(`Error loading GraphQL query from ${filePath}:`, error);
      throw new Error(`Failed to load GraphQL query: ${error.message}`);
    }
  }
}
