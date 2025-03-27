
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../../../_shared/cors.ts';
import { ShopifyClient } from './query.ts';

async function handler(req: Request): Promise<Response> {
  console.log("Received request for product catalog snapshot");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { credentials, limit = 50 } = requestData;
    
    console.log(`Processing request with limit: ${limit}`);
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      console.error("Missing required Shopify credentials");
      return new Response(
        JSON.stringify({ error: 'Missing required Shopify credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version
    );
    
    console.log("Executing query for product catalog snapshot");
    const data = await client.executeProductCatalogQuery(limit);
    
    console.log(`Successfully retrieved product catalog data`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in pre_product_catalog_snapshot:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch product catalog snapshot',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
