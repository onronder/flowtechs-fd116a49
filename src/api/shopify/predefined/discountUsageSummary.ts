
import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for discount usage summary response
 */
export interface DiscountUsageSummaryResponse {
  orders: any[];
  ordersWithDiscounts: any[];
  meta: {
    apiCallCount: number;
    totalOrders: number;
    totalOrdersWithDiscounts: number;
  };
}

/**
 * Fetch discount usage summary
 */
export async function fetchDiscountUsageSummary(limit: number = 25): Promise<DiscountUsageSummaryResponse> {
  try {
    console.log(`Fetching discount usage summary with limit: ${limit}`);
    
    // Get the Shopify source configuration
    const { data: sources, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('source_type', 'shopify')
      .limit(1);
    
    if (sourceError) {
      throw new Error(`Failed to fetch Shopify source: ${sourceError.message}`);
    }
    
    if (!sources || sources.length === 0) {
      throw new Error('No Shopify source found');
    }
    
    // Use the first Shopify source found
    const sourceConfig = sources[0].config;
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke(
      'shopify/predefined/orders/pre_discount_usage_summary',
      {
        body: {
          config: sourceConfig,
          limit
        }
      }
    );
    
    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    if (!data || !data.success || !data.data) {
      throw new Error('Invalid response from edge function');
    }
    
    return data.data as DiscountUsageSummaryResponse;
  } catch (error) {
    console.error('Error fetching discount usage summary:', error);
    throw error;
  }
}
