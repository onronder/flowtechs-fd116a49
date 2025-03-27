
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../../../_shared/cors.ts';
import { ShopifyClient } from './query.ts';

async function handler(req: Request): Promise<Response> {
  console.log("Received request for order line items");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { credentials, orderIds } = requestData;
    
    console.log(`Processing request for ${orderIds?.length || 0} orders`);
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      console.error("Missing required Shopify credentials");
      return new Response(
        JSON.stringify({ error: 'Missing required Shopify credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      console.error("Missing or invalid order IDs");
      return new Response(
        JSON.stringify({ error: 'Missing or invalid order IDs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version
    );
    
    console.log("Executing query for order line items");
    const data = await client.executeOrderLineItemsQuery(orderIds);
    
    console.log(`Successfully retrieved line items data for ${data.orders.length} orders`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in dep_order_line_items:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch order line items',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
