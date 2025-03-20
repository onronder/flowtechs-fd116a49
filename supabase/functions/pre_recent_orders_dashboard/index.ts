
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from './corsUtils.ts'
import { fetchShopifySource, logOperation } from './databaseService.ts'
import { fetchRecentOrders } from './shopifyService.ts'

interface OrdersQueryParams {
  limit?: number;
  days?: number;
  status?: string;
  cursor?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Parse the request
    const { limit = 50, days = 30, status = 'any', cursor } = await req.json() as OrdersQueryParams

    // Create a Supabase client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from the request
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the Shopify credentials from source config
    const sourceData = await fetchShopifySource(supabase, user.id);
    
    // Fetch orders from Shopify
    const { orders, pageInfo, error } = await fetchRecentOrders(
      sourceData.config,
      { limit, days, status, cursor }
    );
    
    if (error) {
      // Log the error
      await logOperation(supabase, {
        userId: user.id,
        action: 'fetch_recent_orders',
        resourceType: 'shopify_api',
        resourceId: sourceData.id,
        details: { 
          error: error.type, 
          message: error.message,
          status: error.status 
        }
      });
      
      return new Response(JSON.stringify({ error: error.message, details: error.details }), {
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the successful operation
    await logOperation(supabase, {
      userId: user.id,
      action: 'fetch_recent_orders',
      resourceType: 'shopify_api',
      resourceId: sourceData.id,
      details: { 
        days, 
        status, 
        count: orders.length,
        has_next_page: pageInfo.hasNextPage
      }
    });

    // Return the processed data
    return new Response(
      JSON.stringify({
        orders,
        pageInfo,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    // Handle any unexpected errors
    console.error("Error in pre_recent_orders_dashboard:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
