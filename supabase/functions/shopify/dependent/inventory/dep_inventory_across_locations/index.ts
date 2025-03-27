
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../../../_shared/cors.ts';
import { ShopifyClient } from './query.ts';

async function handler(req: Request): Promise<Response> {
  console.log("Received request for inventory across locations");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { credentials, productIds } = requestData;
    
    console.log(`Processing request for ${productIds?.length || 0} products`);
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      console.error("Missing required Shopify credentials");
      return new Response(
        JSON.stringify({ error: 'Missing required Shopify credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      console.error("Missing or invalid product IDs");
      return new Response(
        JSON.stringify({ error: 'Missing or invalid product IDs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version
    );
    
    console.log("Executing query for inventory across locations");
    const data = await client.executeInventoryAcrossLocationsQuery(productIds);
    
    console.log(`Successfully retrieved inventory data for ${data.products.length} products`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in dep_inventory_across_locations:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch inventory across locations',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
