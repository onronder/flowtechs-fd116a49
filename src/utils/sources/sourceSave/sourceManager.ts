
import { SourceDataForApi } from "@/types/source";
import { saveShopifySource } from "./shopifySaveManager";

/**
 * Generic function to save a source based on its type
 */
export async function saveSource(sourceData: SourceDataForApi) {
  if (sourceData.source_type === 'shopify') {
    return saveShopifySource(sourceData);
  }
  throw new Error(`Unsupported source type: ${sourceData.source_type}`);
}
