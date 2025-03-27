
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for product catalog item
 */
export interface ProductCatalogItem {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  status: string;
  totalInventory: number;
  tags?: string[];
  variant: {
    id: string;
    title: string;
    sku: string | null;
    price: string;
    inventoryQuantity: number | null;
  } | null;
}

/**
 * Pagination interface for product catalog
 */
export interface ProductCatalogPagination {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Fetch a catalog snapshot of products from a Shopify store
 * @param sourceId The ID of the Shopify source
 * @param limit Optional limit of products to fetch (default: 25)
 * @param cursor Optional cursor for pagination
 * @returns Promise with products and pagination info
 */
export async function fetchProductCatalogSnapshot(
  sourceId: string, 
  limit: number = 25,
  cursor: string | null = null
): Promise<{
  products: ProductCatalogItem[];
  pagination: ProductCatalogPagination;
}> {
  try {
    console.log(`Fetching product catalog snapshot for source ${sourceId}`);
    
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
    
    // Properly type the config object using type assertion to access properties
    const config = source.config as Record<string, any>;
    
    // Extract credentials from source config
    const credentials = {
      storeName: config.storeName,
      accessToken: config.accessToken,
      api_version: config.api_version
    };
    
    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke(
      'shopify/predefined/products/pre_product_catalog_snapshot',
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
      throw new Error(data?.error || 'Unknown error fetching product catalog');
    }
    
    return {
      products: data.data.products,
      pagination: data.data.pageInfo
    };
  } catch (error) {
    console.error('Error fetching product catalog snapshot:', error);
    throw error;
  }
}
