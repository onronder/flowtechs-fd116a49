
import { corsHeaders, handleCors, errorResponse, successResponse } from "../../../_shared/cors.ts";
import { BaseShopifyClient } from "../../_shared/client.ts";

// Load the GraphQL query for discount usage summary
const queryPath = new URL('./query.graphql', import.meta.url).href;

/**
 * Shopify client implementation for discount usage summary
 */
class DiscountUsageSummaryClient extends BaseShopifyClient {
  /**
   * Fetch discount usage summary data from Shopify
   */
  async fetchDiscountUsageSummary(paginationLimit = 25): Promise<any> {
    try {
      console.log(`Fetching discount usage summary for store: ${this.storeName}`);
      
      // Load and execute the GraphQL query
      const queryText = await this.loadGraphQLQuery(queryPath);
      
      let hasNextPage = true;
      let after: string | null = null;
      let allOrders: Array<any> = [];
      let apiCallCount = 0;
      const apiErrors: Array<string> = [];
      
      // Paginate through all results
      while (hasNextPage) {
        apiCallCount++;
        console.log(`Making API call #${apiCallCount} for orders with cursor: ${after || 'INITIAL'}`);
        
        try {
          const data = await this.executeQuery<any>(queryText, {
            first: paginationLimit,
            after: after
          });
          
          // Extract page info and orders
          const pageInfo = data.orders.pageInfo;
          const edges = data.orders.edges;
          
          console.log(`Received ${edges.length} orders`);
          
          // Add orders to the result array
          allOrders = [...allOrders, ...edges.map((edge: any) => edge.node)];
          
          // Check if there are more pages
          hasNextPage = pageInfo.hasNextPage;
          after = pageInfo.endCursor;
          
          if (!hasNextPage) {
            console.log("No more pages to fetch");
            break;
          }
          
          // Limit the number of API calls to avoid rate limiting
          if (apiCallCount >= 5) {
            console.log("Reached maximum API calls (5), stopping pagination");
            break;
          }
        } catch (error) {
          console.error("Error fetching orders page:", error);
          apiErrors.push(`Error on page ${apiCallCount}: ${error.message || String(error)}`);
          break;
        }
      }
      
      // Process orders to create discount summary
      const discountSummary = this.processDiscountUsage(allOrders);
      
      return {
        orders: allOrders,
        summary: discountSummary,
        meta: {
          apiCallCount,
          totalOrders: allOrders.length,
          errors: apiErrors
        }
      };
    } catch (error) {
      console.error("Error fetching discount usage summary:", error);
      throw error;
    }
  }
  
  /**
   * Process orders and create a summary of discount usage
   */
  private processDiscountUsage(orders: any[]): any {
    // Filter orders with discounts
    const ordersWithDiscounts = orders.filter(order => 
      order.discountApplications.edges.length > 0);
    
    console.log(`Found ${ordersWithDiscounts.length} orders with discounts out of ${orders.length} total orders`);
    
    // Initialize counters
    const discountsByCode: Record<string, { 
      count: number,
      totalDiscountAmount: number,
      totalOrderValue: number,
      currency: string,
      percentageDiscounts: number[]
    }> = {};
    
    let totalOrdersWithDiscounts = 0;
    let totalOrderValue = 0;
    let totalDiscountValue = 0;
    
    // Process each order with discounts
    ordersWithDiscounts.forEach(order => {
      totalOrdersWithDiscounts++;
      const orderCurrency = order.totalPriceSet.shopMoney.currencyCode;
      const orderTotal = parseFloat(order.totalPriceSet.shopMoney.amount);
      totalOrderValue += orderTotal;
      
      // Process each discount application in the order
      order.discountApplications.edges.forEach((edge: any) => {
        const discount = edge.node;
        let discountCode: string;
        let discountAmount = 0;
        let isPercentage = false;
        let percentageValue = 0;
        
        // Handle different discount types
        if (discount.__typename === 'DiscountCodeApplication') {
          discountCode = discount.code;
          
          // Handle money or percentage discounts
          if (discount.value && discount.value.__typename === 'MoneyV2') {
            discountAmount = parseFloat(discount.value.amount);
          } else if (discount.value && discount.value.__typename === 'PricingPercentageValue') {
            isPercentage = true;
            percentageValue = parseFloat(discount.value.percentage);
            // Estimate discount amount based on order total and percentage
            discountAmount = orderTotal * (percentageValue / 100);
          }
        } else if (
          discount.__typename === 'ManualDiscountApplication' || 
          discount.__typename === 'ScriptDiscountApplication' ||
          discount.__typename === 'AutomaticDiscountApplication'
        ) {
          discountCode = discount.title || `${discount.__typename}`;
          
          // Handle money or percentage discounts
          if (discount.value && discount.value.__typename === 'MoneyV2') {
            discountAmount = parseFloat(discount.value.amount);
          } else if (discount.value && discount.value.__typename === 'PricingPercentageValue') {
            isPercentage = true;
            percentageValue = parseFloat(discount.value.percentage);
            // Estimate discount amount based on order total and percentage
            discountAmount = orderTotal * (percentageValue / 100);
          }
        } else {
          discountCode = 'Unknown Discount';
        }
        
        // Add to running total
        totalDiscountValue += discountAmount;
        
        // Update discount code summary
        if (!discountsByCode[discountCode]) {
          discountsByCode[discountCode] = {
            count: 0,
            totalDiscountAmount: 0,
            totalOrderValue: 0,
            currency: orderCurrency,
            percentageDiscounts: []
          };
        }
        
        discountsByCode[discountCode].count++;
        discountsByCode[discountCode].totalDiscountAmount += discountAmount;
        discountsByCode[discountCode].totalOrderValue += orderTotal;
        
        if (isPercentage) {
          discountsByCode[discountCode].percentageDiscounts.push(percentageValue);
        }
      });
    });
    
    // Convert to array for easier processing in frontend
    const discountCodesSummary = Object.keys(discountsByCode).map(code => {
      const data = discountsByCode[code];
      const avgDiscountPerOrder = data.totalDiscountAmount / data.count;
      const avgOrderValue = data.totalOrderValue / data.count;
      const discountPercentage = (data.totalDiscountAmount / data.totalOrderValue) * 100;
      
      // Calculate average percentage if percentage discounts were used
      let avgPercentage = null;
      if (data.percentageDiscounts.length > 0) {
        avgPercentage = data.percentageDiscounts.reduce((sum, val) => sum + val, 0) / data.percentageDiscounts.length;
      }
      
      return {
        code,
        usageCount: data.count,
        totalDiscountAmount: data.totalDiscountAmount.toFixed(2),
        totalOrderValue: data.totalOrderValue.toFixed(2),
        avgDiscountPerOrder: avgDiscountPerOrder.toFixed(2),
        avgOrderValue: avgOrderValue.toFixed(2),
        discountPercentage: discountPercentage.toFixed(2),
        avgPercentageValue: avgPercentage !== null ? avgPercentage.toFixed(2) : null,
        currency: data.currency
      };
    });
    
    // Sort by usage count (descending)
    discountCodesSummary.sort((a, b) => b.usageCount - a.usageCount);
    
    return {
      totalOrdersWithDiscounts,
      totalOrderValue,
      totalDiscountValue,
      discountCodesSummary
    };
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
    console.log("Processing discount usage summary request");
    
    // Parse request
    let body;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error("Error parsing request body:", error);
      return errorResponse("Invalid JSON in request body", 400);
    }
    
    // Get source configuration
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
    
    const discountData = await client.fetchDiscountUsageSummary(limit);
    
    return successResponse({
      success: true,
      data: discountData
    });
  } catch (error) {
    console.error("Error processing discount usage summary:", error);
    return errorResponse(`Error: ${error.message || String(error)}`, 500);
  }
});
