
import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for sales by geographic region response
 */
export interface SalesByGeographicRegionResponse {
  orders: {
    id: string;
    name: string;
    processedAt: string;
    totalPrice: {
      amount: number;
      currencyCode: string;
    } | null;
    shippingAddress: {
      country: string;
      province: string;
      city: string;
      zip: string;
    } | null;
  }[];
  geographicStats: {
    countries: Record<string, number>;
    provinces: Record<string, number>;
    cities: Record<string, number>;
  };
  meta: {
    totalOrders: number;
    apiCallCount: number;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

/**
 * Fetch sales data by geographic region
 */
export async function fetchSalesByGeographicRegion(limit: number = 25): Promise<SalesByGeographicRegionResponse> {
  try {
    console.log(`Fetching sales by geographic region with limit: ${limit}`);
    
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
      'shopify/predefined/orders/pre_sales_by_geographic_region',
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
    
    return data.data as SalesByGeographicRegionResponse;
  } catch (error) {
    console.error('Error fetching sales by geographic region:', error);
    throw error;
  }
}

// Re-export the function to maintain consistency with the API
export { fetchSalesByGeographicRegion as fetchGeographicSalesData };
