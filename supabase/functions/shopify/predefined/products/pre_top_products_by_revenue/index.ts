import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../../../_shared/cors.ts';
import { ShopifyClient } from './query.ts';

const SHOPIFY_ADMIN_API_VERSION = '2023-07';

interface ShopifyCredentials {
  storeName: string;
  accessToken: string;
}

interface TopProductsResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        totalSales: number;
        vendor: string;
        // Other product fields...
      }
    }>
  }
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { credentials } = await req.json() as { credentials: ShopifyCredentials };
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required Shopify credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      SHOPIFY_ADMIN_API_VERSION
    );
    
    const data = await client.executeTopProductsQuery<TopProductsResponse>();
    
    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in pre_top_products_by_revenue:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch top products by revenue',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
