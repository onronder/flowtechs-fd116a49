
/**
 * Interface for orders query parameters
 */
interface OrdersQueryParams {
  limit: number;
  days: number;
  status: string;
  cursor?: string | null;
}

/**
 * Interface for Shopify error
 */
interface ShopifyError {
  type: string;
  message: string;
  status?: number;
  details?: any;
}

/**
 * Fetches recent orders from Shopify
 */
export async function fetchRecentOrders(
  config: Record<string, any>,
  params: OrdersQueryParams
): Promise<{
  orders: any[];
  pageInfo: any;
  error?: ShopifyError;
}> {
  try {
    // Extract credentials
    const { storeName, accessToken, api_version } = config;
    
    if (!storeName || !accessToken) {
      return {
        orders: [],
        pageInfo: { hasNextPage: false },
        error: {
          type: 'credentials_error',
          message: 'Invalid Shopify credentials',
          status: 400
        }
      };
    }

    // Construct the GraphQL query for recent orders
    const query = buildOrdersQuery();
    
    // Construct the query string based on parameters
    const queryString = `created_at:>-${params.days}d${params.status !== 'any' ? ` status:${params.status}` : ''}`
    
    // Variables for the GraphQL query
    const variables = {
      first: Math.min(params.limit, 250), // Maximum of 250 per request
      after: params.cursor || null,
      query: queryString
    }

    // Make the request to Shopify
    const apiVersion = api_version || '2023-10'
    const response = await fetch(`https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        orders: [],
        pageInfo: { hasNextPage: false },
        error: {
          type: 'api_error',
          message: 'Shopify API error',
          status: response.status,
          details: errorText
        }
      };
    }

    const result = await response.json()

    // Check for GraphQL errors
    if (result.errors) {
      return {
        orders: [],
        pageInfo: { hasNextPage: false },
        error: {
          type: 'graphql_error',
          message: 'GraphQL errors',
          status: 400,
          details: result.errors
        }
      };
    }

    // Process the orders data
    const orders = result.data.orders.edges.map((edge: any) => edge.node)
    const pageInfo = result.data.orders.pageInfo

    return { orders, pageInfo };
  } catch (error) {
    return {
      orders: [],
      pageInfo: { hasNextPage: false },
      error: {
        type: 'unexpected_error',
        message: error.message || 'An unexpected error occurred',
        status: 500
      }
    };
  }
}

/**
 * Builds the GraphQL query for recent orders
 */
function buildOrdersQuery(): string {
  return `
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
  `;
}
