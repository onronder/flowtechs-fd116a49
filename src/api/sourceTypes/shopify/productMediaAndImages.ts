
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for product image
 */
export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

/**
 * Interface for product media
 */
export interface ProductMedia {
  id: string;
  alt: string | null;
  mediaContentType: string;
  status: string;
  preview?: {
    image?: {
      url: string;
    }
  };
}

/**
 * Interface for product with media and images
 */
export interface ProductWithMedia {
  id: string;
  title: string;
  images: ProductImage[];
  media: ProductMedia[];
}

/**
 * Pagination interface
 */
export interface ProductMediaPagination {
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Fetch product media and images data from a Shopify store
 * @param sourceId The ID of the Shopify source
 * @param productIds Optional array of specific product IDs to fetch media for
 * @param limit Optional limit of products to fetch in primary query (default: 25)
 * @param cursor Optional cursor for pagination
 * @returns Promise with products with media and pagination info
 */
export async function fetchProductMediaAndImages(
  sourceId: string,
  productIds?: string[],
  limit: number = 25,
  cursor: string | null = null
): Promise<{
  products: ProductWithMedia[];
  pagination: ProductMediaPagination;
}> {
  try {
    console.log(`Fetching product media and images for source ${sourceId}`);
    
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
      'shopify/dependent/products/dep_product_media_and_images',
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
      throw new Error(data?.error || 'Unknown error fetching product media and images');
    }
    
    return {
      products: data.data.products,
      pagination: {
        hasNextPage: data.data.pageInfo.hasNextPage,
        endCursor: data.data.pageInfo.endCursor
      }
    };
  } catch (error) {
    console.error('Error fetching product media and images:', error);
    throw error;
  }
}
