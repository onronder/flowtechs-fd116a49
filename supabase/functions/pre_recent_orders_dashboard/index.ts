
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrdersQueryParams {
  limit?: number;
  days?: number;
  status?: string;
  cursor?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Fetch the Shopify credentials for this user
    const { data: shopifyCredentials, error: credentialsError } = await supabase
      .from('shopify_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (credentialsError || !shopifyCredentials) {
      return new Response(JSON.stringify({ error: 'Shopify credentials not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Construct the GraphQL query for recent orders
    const query = `
      query GetRecentOrders($first: Int!, $after: String, $query: String) {
        orders(first: $first, after: $after, query: $query) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              name
              createdAt
              processedAt
              displayFinancialStatus
              displayFulfillmentStatus
              subtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalShippingPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalTaxSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
                displayName
                email
                phone
              }
              shippingAddress {
                address1
                address2
                city
                province
                country
                zip
                name
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    originalTotalSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
              tags
              note
            }
          }
        }
      }
    `

    // Construct the query string based on parameters
    const queryString = `created_at:>-${days}d status:${status}`
    
    // Variables for the GraphQL query
    const variables = {
      first: Math.min(limit, 250), // Maximum of 250 per request
      after: cursor || null,
      query: queryString
    }

    // Make the request to Shopify
    const response = await fetch(`https://${shopifyCredentials.shop_name}.myshopify.com/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifyCredentials.access_token,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({ error: 'Shopify API error', details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await response.json()

    // Check for GraphQL errors
    if (result.errors) {
      return new Response(JSON.stringify({ error: 'GraphQL errors', details: result.errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Process the orders data
    const orders = result.data.orders.edges.map((edge: any) => edge.node)
    const pageInfo = result.data.orders.pageInfo

    // Log the operation
    await supabase
      .from('shopify_logs')
      .insert([
        {
          user_id: user.id,
          operation: 'fetch_recent_orders',
          status: 'success',
          details: { days, status, count: orders.length },
        },
      ])

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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
