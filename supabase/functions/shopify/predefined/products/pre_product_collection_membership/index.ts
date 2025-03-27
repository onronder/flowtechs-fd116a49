
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../../../_shared/cors.ts";
import { BaseShopifyClient } from "../../../_shared/client.ts";

class ProductCollectionMembershipClient extends BaseShopifyClient {
  async fetchProductCollectionMembership(limit: number = 25, cursor: string | null = null) {
    // Load the query from the query.graphql file
    const queryPath = "./query.graphql";
    const query = await this.loadGraphQLQuery(queryPath);
    
    // Set up variables for the query
    const variables = {
      first: limit,
      after: cursor
    };
    
    // Execute the query
    console.log(`Executing product collection membership query with limit: ${limit}, cursor: ${cursor || 'null'}`);
    const result = await this.executeQuery(query, variables);
    
    if (!result || !result.products) {
      throw new Error("Invalid response from Shopify API");
    }
    
    // Extract products with collections
    const products = result.products.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      collections: edge.node.collections.edges.map((collectionEdge: any) => ({
        id: collectionEdge.node.id,
        title: collectionEdge.node.title,
        handle: collectionEdge.node.handle,
        updatedAt: collectionEdge.node.updatedAt
      }))
    }));
    
    // Return formatted data and pagination info
    return {
      products,
      pageInfo: result.products.pageInfo
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse the request body
    const requestData = await req.json();
    
    // Extract credentials, limit, and cursor from the request
    const { credentials, limit = 25, cursor = null } = requestData;
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      return errorResponse("Missing required credentials", 400);
    }
    
    // Create client instance
    const client = new ProductCollectionMembershipClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version
    );
    
    // Fetch product collection membership data
    const data = await client.fetchProductCollectionMembership(limit, cursor);
    
    // Return successful response
    return successResponse({
      data
    });
  } catch (error) {
    console.error("Error in product collection membership function:", error);
    return errorResponse(error.message || "An error occurred", 500);
  }
});
