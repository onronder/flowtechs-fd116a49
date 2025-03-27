import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../../../_shared/cors.ts";
import { ShopifyClient } from "./query.ts";

async function handler(req: Request): Promise<Response> {
  console.log("Received request for product media and images");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { credentials, productIds, limit = 25, cursor = null } = requestData;
    
    console.log(`Processing request${productIds ? ` for ${productIds.length} specific products` : ` for up to ${limit} products`}`);
    
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
    
    let data;
    
    // If specific product IDs are provided, fetch media for those products
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      console.log("Executing query for specific product media");
      data = await client.executeProductMediaQuery(productIds);
    } else {
      // Otherwise, fetch product IDs first using the primary query
      console.log("Fetching product IDs first, then media");
      const productData = await client.fetchProductIds(limit, cursor);
      
      // If there are products, fetch their media
      if (productData.products.length > 0) {
        const productIdsToFetch = productData.products.map((p: any) => p.id);
        const mediaData = await client.executeProductMediaQuery(productIdsToFetch);
        
        // Combine the data
        data = {
          products: mediaData.products,
          pageInfo: productData.pageInfo
        };
      } else {
        // No products found
        data = {
          products: [],
          pageInfo: productData.pageInfo
        };
      }
    }
    
    console.log(`Successfully retrieved media data for ${data.products.length} products`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in dep_product_media_and_images:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch product media and images',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
