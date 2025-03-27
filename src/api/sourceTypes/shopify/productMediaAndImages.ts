
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch product media and images using dependent queries
 * 
 * This is a dependent query that:
 * 1. First fetches all product IDs
 * 2. Then for each product, fetches its media (images, videos, 3D models)
 * 
 * @param sourceId - The Shopify source ID
 * @param limit - Optional limit of products to fetch (default: 50)
 * @returns Product media data
 */
export async function fetchProductMediaAndImages(sourceId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "dep_product_media_and_images", 
      {
        body: { 
          sourceId,
          limit
        }
      }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching product media and images:", error);
    throw error;
  }
}
