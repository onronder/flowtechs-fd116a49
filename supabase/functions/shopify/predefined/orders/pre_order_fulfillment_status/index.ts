
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../../../_shared/cors.ts';
import { ShopifyClient } from './query.ts';

async function handler(req: Request): Promise<Response> {
  console.log("Received request for order fulfillment status");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { config, limit = 25 } = requestData;
    
    console.log(`Processing request for order fulfillment status with limit: ${limit}`);
    
    if (!config || !config.storeName || !config.accessToken) {
      console.error("Missing required Shopify credentials");
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required Shopify credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    const client = new ShopifyClient(
      config.storeName,
      config.accessToken,
      config.apiVersion || config.api_version
    );
    
    console.log("Executing query for order fulfillment status");
    const data = await client.executeFulfillmentStatusQuery(limit);
    
    console.log(`Successfully retrieved fulfillment status data for ${data.orders.length} orders`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in pre_order_fulfillment_status:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to fetch order fulfillment status data',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
