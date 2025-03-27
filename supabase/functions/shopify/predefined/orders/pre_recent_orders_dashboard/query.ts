
import { DocumentNode } from 'graphql';
import { gql } from 'https://esm.sh/graphql-request@6.1.0';

export const RECENT_ORDERS_QUERY = gql`
query PreRecentOrdersDashboard($first: Int!, $after: String) {
  orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        name
        processedAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          email
          displayName
        }
      }
    }
  }
}
`;

export class ShopifyClient {
  private storeName: string;
  private accessToken: string;
  private apiVersion: string;
  
  constructor(storeName: string, accessToken: string, apiVersion: string = '2023-10') {
    this.storeName = storeName;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion || '2023-10';
  }
  
  async executeRecentOrdersQuery(limit: number = 25, days: number = 30, status: string = 'any'): Promise<any> {
    const variables = {
      first: limit,
      after: null
    };
    
    try {
      const endpoint = `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/graphql.json`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken
        },
        body: JSON.stringify({
          query: RECENT_ORDERS_QUERY,
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
      
      return result.data;
    } catch (error) {
      console.error('Error executing recent orders query:', error);
      throw error;
    }
  }
}
