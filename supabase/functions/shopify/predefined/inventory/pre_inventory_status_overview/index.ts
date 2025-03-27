
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../../../../_shared/cors.ts";
import { ShopifyClient } from "./query.ts";

interface ShopifyCredentials {
  storeName: string;
  accessToken: string;
  api_version?: string;
}

interface RequestPayload {
  credentials: ShopifyCredentials;
  limit?: number;
  cursor?: string;
}

async function handler(req: Request): Promise<Response> {
  console.log("Received request for inventory status overview");
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    const requestData = await req.json() as RequestPayload;
    const { credentials, limit = 50, cursor } = requestData;
    
    console.log(`Processing request for inventory status with limit: ${limit}`);
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      console.error("Missing required Shopify credentials");
      return errorResponse('Missing required Shopify credentials');
    }
    
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version
    );
    
    console.log("Executing query for inventory status overview");
    const data = await client.executeInventoryStatusQuery(limit, cursor);
    
    console.log(`Successfully retrieved inventory status for ${data.products.length} products`);
    
    // Add metadata about query execution
    const responseData = {
      data,
      meta: {
        query: "inventory_status_overview",
        timestamp: new Date().toISOString(),
        limit,
        hasMore: data.pageInfo.hasNextPage,
        nextCursor: data.pageInfo.hasNextPage ? data.pageInfo.endCursor : null
      }
    };
    
    return successResponse(responseData);
  } catch (error) {
    console.error('Error in pre_inventory_status_overview:', error);
    
    return errorResponse(
      'Failed to fetch inventory status overview',
      500
    );
  }
}

serve(handler);
