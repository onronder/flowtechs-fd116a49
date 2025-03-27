
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for collection data
 */
export interface Collection {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
}

/**
 * Interface for product with collection data
 */
export interface ProductWithCollections {
  id: string;
  title: string;
  collections: Collection[];
}

/**
 * Pagination interface
 */
export interface ProductCollectionPagination {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Fetch product collection membership data from a Shopify store
 * @param sourceId The ID of the Shopify source
 * @param limit Optional limit of products to fetch (default: 25)
 * @param cursor Optional cursor for pagination
 * @returns Promise with products with collections and pagination info
 */
export async function fetchProductCollectionMembership(
  sourceId: string,
  limit: number = 25,
  cursor: string | null = null
): Promise<{
  products: ProductWithCollections[];
  pagination: ProductCollectionPagination;
}> {
  try {
    console.log(`Fetching product collection membership for source ${sourceId}`);
    
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
      'shopify/predefined/products/pre_product_collection_membership',
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
      throw new Error(data?.error || 'Unknown error fetching product collection membership');
    }
    
    return {
      products: data.data.products,
      pagination: data.data.pageInfo
    };
  } catch (error) {
    console.error('Error fetching product collection membership:', error);
    throw error;
  }
}
