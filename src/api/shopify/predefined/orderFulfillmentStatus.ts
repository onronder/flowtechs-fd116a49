
import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for order fulfillment status response
 */
export interface OrderFulfillmentStatusResponse {
  orders: {
    id: string;
    name: string;
    processedAt: string;
    fulfillmentStatus: string;
    shippingAddress: {
      name: string;
      address1: string;
      city: string;
      country: string;
      zip: string;
    } | null;
    fulfillments: Array<{
      status: string;
      trackingInfo: Array<{
        number: string;
        url: string | null;
        company: string | null;
      }>;
      estimatedDeliveryAt: string | null;
      deliveredAt: string | null;
    }>;
  }[];
  statusCounts: Record<string, number>;
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
 * Fetch order fulfillment status
 */
export async function fetchOrderFulfillmentStatus(limit: number = 25): Promise<OrderFulfillmentStatusResponse> {
  try {
    console.log(`Fetching order fulfillment status with limit: ${limit}`);
    
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
      'shopify/predefined/orders/pre_order_fulfillment_status',
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
    
    return data.data as OrderFulfillmentStatusResponse;
  } catch (error) {
    console.error('Error fetching order fulfillment status:', error);
    throw error;
  }
}
