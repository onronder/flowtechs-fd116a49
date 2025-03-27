
import { BaseShopifyClient } from "../../../../_shared/client.ts";
import { corsHeaders } from "../../../../_shared/cors.ts";

export interface CustomerActivity {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  lastOrder?: {
    id: string;
    name: string;
    processedAt: string;
    totalPriceSet?: {
      shopMoney?: {
        amount: string;
        currencyCode: string;
      };
    };
  };
}

export interface RecentCustomerActivityResponse {
  customers: CustomerActivity[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

export class ShopifyClient extends BaseShopifyClient {
  /**
   * Execute the recent customer activity query
   */
  async executeRecentCustomerActivity(
    limit: number = 10,
    cursor?: string
  ): Promise<RecentCustomerActivityResponse> {
    try {
      // Load the GraphQL query
      const queryString = await this.loadGraphQLQuery("./query.graphql");
      
      console.log(`Executing recent customer activity query with limit: ${limit}, cursor: ${cursor || 'none'}`);
      
      // Execute the query with pagination variables
      const result = await this.executeQuery<{
        customers: {
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string;
          };
          edges: Array<{
            node: {
              id: string;
              displayName: string;
              email: string;
              createdAt: string;
              lastOrder?: {
                id: string;
                name: string;
                processedAt: string;
                totalPriceSet?: {
                  shopMoney?: {
                    amount: string;
                    currencyCode: string;
                  };
                };
              };
            };
          }>;
        };
      }>(queryString, {
        first: limit,
        after: cursor
      });
      
      // Process and format the response
      const customers = result.customers.edges.map(edge => edge.node);
      
      return {
        customers,
        pageInfo: result.customers.pageInfo
      };
    } catch (error) {
      console.error("Error executing recent customer activity query:", error);
      throw error;
    }
  }
}
