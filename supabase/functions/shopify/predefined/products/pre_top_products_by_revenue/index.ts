
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../../../_shared/cors.ts';
import { ShopifyClient } from './query.ts';

interface ShopifyCredentials {
  storeName: string;
  accessToken: string;
  api_version?: string;
}

async function handler(req: Request): Promise<Response> {
  console.log("Received request for top products by revenue");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { credentials, limit = 25, cursor = null } = requestData;
    
    console.log(`Processing request with limit: ${limit}, cursor: ${cursor || 'none'}`);
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      console.error("Missing required Shopify credentials");
      return new Response(
        JSON.stringify({ error: 'Missing required Shopify credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    // Use the provided API version or let the ShopifyClient handle detection
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version // Pass the API version from credentials
    );
    
    console.log("Executing query for top products by revenue");
    const result = await client.executeTopProductsQuery(limit, cursor);
    
    console.log(`Successfully retrieved ${result.products.length} products`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: result.products,
        pagination: result.pagination
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in pre_top_products_by_revenue:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch top products by revenue',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
