
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for top products by revenue
 */
export interface TopProduct {
  id: string;
  title: string;
  vendor: string;
  status: string;
  totalInventory: number;
  variant: {
    id: string;
    title: string;
    price: string;
    inventoryQuantity: number | null;
    sku: string | null;
  } | null;
}

/**
 * Pagination interface for top products
 */
export interface TopProductsPagination {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Fetch top products by revenue from a Shopify store
 * @param sourceId The ID of the Shopify source
 * @param limit Optional limit of products to fetch (default: 25)
 * @param cursor Optional cursor for pagination
 * @returns Promise with products and pagination info
 */
export async function fetchTopProductsByRevenue(
  sourceId: string, 
  limit: number = 25,
  cursor: string | null = null
): Promise<{
  products: TopProduct[];
  pagination: TopProductsPagination;
}> {
  try {
    console.log(`Fetching top products by revenue for source ${sourceId}`);
    
    // Get source credentials first
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('config')
      .eq('id', sourceId)
      .single();
    
    if (sourceError) {
      throw new Error(`Failed to fetch source: ${sourceError.message}`);
    }
    
    if (!source || !source.config) {
      throw new Error('Source configuration not found');
    }
    
    // Extract credentials from source config
    const credentials = {
      storeName: source.config.store_name,
      accessToken: source.config.access_token,
      api_version: source.config.api_version
    };
    
    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke(
      'shopify/predefined/products/pre_top_products_by_revenue',
      {
        body: {
          credentials,
          limit,
          cursor
        }
      }
    );
    
    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Unknown error fetching top products');
    }
    
    return {
      products: data.data,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('Error fetching top products by revenue:', error);
    throw error;
  }
}
