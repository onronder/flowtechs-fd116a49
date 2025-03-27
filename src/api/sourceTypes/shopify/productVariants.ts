
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for product variant data
 */
export interface ProductVariant {
  id: string;
  title: string;
  displayName?: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  selectedOptions: {
    name: string;
    value: string;
  }[];
  image?: {
    url: string;
    altText: string | null;
  };
}

/**
 * Interface for product with variants
 */
export interface ProductWithVariants {
  id: string;
  title: string;
  variants: ProductVariant[];
}

/**
 * Pagination interface
 */
export interface ProductVariantsPagination {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Fetch product variants data from a Shopify store
 * @param sourceId The ID of the Shopify source
 * @param productIds Optional array of specific product IDs to fetch variants for
 * @param limit Optional limit of products to fetch in primary query (default: 25)
 * @param cursor Optional cursor for pagination
 * @returns Promise with products with variants and pagination info
 */
export async function fetchProductVariants(
  sourceId: string,
  productIds?: string[],
  limit: number = 25,
  cursor: string | null = null
): Promise<{
  products: ProductWithVariants[];
  pagination: ProductVariantsPagination;
}> {
  try {
    console.log(`Fetching product variants for source ${sourceId}`);
    
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
    
    // Properly type the config object using type assertion
    const config = source.config as Record<string, any>;
    
    // Extract credentials from source config
    const credentials = {
      storeName: config.storeName,
      accessToken: config.accessToken,
      api_version: config.api_version
    };
    
    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke(
      'shopify/dependent/products/dep_product_variants',
      {
        body: {
          credentials,
          productIds,
          limit,
          cursor
        }
      }
    );
    
    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Unknown error fetching product variants');
    }
    
    return {
      products: data.data.products,
      pagination: {
        hasNextPage: data.data.pageInfo.hasNextPage,
        endCursor: data.data.pageInfo.endCursor
      }
    };
  } catch (error) {
    console.error('Error fetching product variants:', error);
    throw error;
  }
}
