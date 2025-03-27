
import { corsHeaders, handleCors, errorResponse, successResponse } from "../../../_shared/cors.ts";
import { BaseShopifyClient } from "../../../_shared/client.ts";

/**
 * Shopify client implementation for discount usage summary
 */
class DiscountUsageSummaryClient extends BaseShopifyClient {
  /**
   * Execute the discount usage query
   */
  async executeDiscountUsageQuery(limit: number = 25): Promise<any> {
    try {
      console.log(`Executing discount usage query with limit: ${limit}`);
      
      // Load the query from the .graphql file
      const queryString = await this.loadGraphQLQuery('./query.graphql');
      
      // Initialize pagination variables
      let hasNextPage = true;
      let after: string | null = null;
      let allOrders: Array<any> = [];
      let apiCallCount = 0;
      
      // Paginate through all results
      while (hasNextPage && apiCallCount < 5) { // Limit to 5 API calls to avoid rate limiting
        apiCallCount++;
        console.log(`Making API call #${apiCallCount} with cursor: ${after || 'INITIAL'}`);
        
        const data = await this.executeQuery(queryString, {
          first: limit,
          after: after
        });
        
        // Extract page info and orders
        const pageInfo = data.orders.pageInfo;
        const edges = data.orders.edges;
        
        // Add orders to the result array
        allOrders = [...allOrders, ...edges.map((edge: any) => edge.node)];
        
        // Check if there are more pages
        hasNextPage = pageInfo.hasNextPage;
        after = pageInfo.endCursor;
        
        // Add delay to avoid rate limiting
        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Filter orders that have discount applications
      const ordersWithDiscounts = allOrders.filter(order => 
        order.discountApplications.edges.length > 0);
      
      console.log(`Found ${ordersWithDiscounts.length} orders with discounts out of ${allOrders.length} total orders`);
      
      return {
        orders: allOrders,
        ordersWithDiscounts,
        meta: {
          apiCallCount,
          totalOrders: allOrders.length,
          totalOrdersWithDiscounts: ordersWithDiscounts.length
        }
      };
    } catch (error) {
      console.error("Error executing discount usage query:", error);
      throw error;
    }
  }
}

// Request handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    console.log("Processing discount usage query request");
    
    // Parse request
    const body = await req.json();
    const { config, limit = 25 } = body;
    
    if (!config || !config.storeName || !config.accessToken) {
      return errorResponse("Missing required configuration (storeName, accessToken)", 400);
    }
    
    // Create client and fetch data
    const client = new DiscountUsageSummaryClient(
      config.storeName,
      config.accessToken,
      config.apiVersion
    );
    
    const discountData = await client.executeDiscountUsageQuery(limit);
    
    return successResponse({
      success: true,
      data: discountData
    });
  } catch (error) {
    console.error("Error processing discount usage request:", error);
    return errorResponse(`Error: ${error.message || String(error)}`, 500);
  }
});
