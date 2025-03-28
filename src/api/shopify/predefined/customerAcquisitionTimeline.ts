
import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for customer acquisition timeline response
 */
export interface CustomerAcquisitionTimelineResponse {
  timeline: Array<{
    month: string;
    count: number;
  }>;
  totalCustomers: number;
  firstOrderMetrics: {
    customersWithFirstOrder: number;
    customersWithoutFirstOrder: number;
    conversionRate: number;
    averageFirstOrderValue: number;
  };
}

/**
 * Fetch customer acquisition timeline data
 */
export async function fetchCustomerAcquisitionTimeline(
  months: number = 12
): Promise<CustomerAcquisitionTimelineResponse> {
  try {
    console.log(`Fetching customer acquisition timeline for last ${months} months`);
    
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
    const credentials = sources[0].config;
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke(
      'shopify/predefined/customers/pre_customer_acquisition_timeline',
      {
        body: {
          credentials,
          months
        }
      }
    );
    
    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    if (!data || !data.success || !data.data) {
      throw new Error('Invalid response from edge function');
    }
    
    return data.data as CustomerAcquisitionTimelineResponse;
  } catch (error) {
    console.error('Error fetching customer acquisition timeline:', error);
    throw error;
  }
}
