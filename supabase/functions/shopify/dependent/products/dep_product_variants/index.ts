import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../../../_shared/cors.ts";
import { ShopifyClient } from "./query.ts";

async function handler(req: Request): Promise<Response> {
  console.log("Received request for product variants");
  
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
    
    // If specific product IDs are provided, fetch variants for those products
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      console.log("Executing query for specific product variants");
      data = await client.executeProductVariantsQuery(productIds);
    } else {
      // Otherwise, fetch product IDs first using the primary query
      console.log("Fetching product IDs first, then variants");
      const productData = await client.fetchProductIds(limit, cursor);
      
      // If there are products, fetch their variants
      if (productData.products.length > 0) {
        const productIdsToFetch = productData.products.map((p: any) => p.id);
        const variantData = await client.executeProductVariantsQuery(productIdsToFetch);
        
        // Combine the data
        data = {
          products: variantData.products,
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
    
    console.log(`Successfully retrieved variants data for ${data.products.length} products`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in dep_product_variants:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch product variants',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

serve(handler);
