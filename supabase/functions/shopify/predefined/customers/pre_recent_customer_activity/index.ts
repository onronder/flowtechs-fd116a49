
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
  console.log("Received request for recent customer activity");
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    const requestData = await req.json() as RequestPayload;
    const { credentials, limit = 10, cursor } = requestData;
    
    console.log(`Processing request for recent customer activity with limit: ${limit}`);
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      console.error("Missing required Shopify credentials");
      return errorResponse('Missing required Shopify credentials');
    }
    
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version
    );
    
    console.log("Executing query for recent customer activity");
    const data = await client.executeRecentCustomerActivity(limit, cursor);
    
    console.log(`Successfully retrieved ${data.customers.length} recent customers`);
    
    // Add metadata about query execution
    const responseData = {
      data,
      meta: {
        query: "recent_customer_activity",
        timestamp: new Date().toISOString(),
        limit,
        hasMore: data.pageInfo.hasNextPage
      }
    };
    
    return successResponse(responseData);
  } catch (error) {
    console.error('Error in pre_recent_customer_activity:', error);
    
    return errorResponse(
      'Failed to fetch recent customer activity',
      500
    );
  }
}

serve(handler);
