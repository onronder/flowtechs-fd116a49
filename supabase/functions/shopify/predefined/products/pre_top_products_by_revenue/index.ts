
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../../../_shared/cors.ts';
import { ShopifyClient } from './query.ts';

interface ShopifyCredentials {
  storeName: string;
  accessToken: string;
  api_version?: string;
}

interface TopProductsResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        vendor: string;
        productType: string;
        totalInventory: number;
        totalVariants: number;
        publishedAt: string;
        priceRangeV2: {
          minVariantPrice: {
            amount: string;
            currencyCode: string;
          };
          maxVariantPrice: {
            amount: string;
            currencyCode: string;
          };
        };
        images: {
          edges: Array<{
            node: {
              url: string;
              altText: string | null;
            }
          }>
        };
      }
    }>
  }
}

async function handler(req: Request): Promise<Response> {
  console.log("Received request for top products by revenue");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { credentials, limit = 10 } = requestData;
    
    console.log(`Processing request with limit: ${limit}`);
    
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
    const data = await client.executeTopProductsQuery<TopProductsResponse>(limit);
    
    // Transform the data for easier consumption
    const transformedProducts = data.products.edges.map(edge => {
      const product = edge.node;
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        productType: product.productType,
        totalInventory: product.totalInventory,
        totalVariants: product.totalVariants,
        publishedAt: product.publishedAt,
        priceRange: {
          min: {
            amount: product.priceRangeV2.minVariantPrice.amount,
            currencyCode: product.priceRangeV2.minVariantPrice.currencyCode
          },
          max: {
            amount: product.priceRangeV2.maxVariantPrice.amount,
            currencyCode: product.priceRangeV2.maxVariantPrice.currencyCode
          }
        },
        primaryImage: product.images.edges.length > 0 ? {
          url: product.images.edges[0].node.url,
          altText: product.images.edges[0].node.altText
        } : null
      };
    });
    
    console.log(`Successfully retrieved ${transformedProducts.length} products`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: transformedProducts 
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
