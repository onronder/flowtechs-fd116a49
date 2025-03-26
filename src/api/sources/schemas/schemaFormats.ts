import { logger } from "@/utils/logger";

const COMPONENT = "schemaFormats";

/**
 * Get the supported schema formats for a source type
 * @param sourceType The source type 
 * @returns Array of supported format identifiers
 */
export async function getSupportedSchemaFormats(sourceType: string): Promise<string[]> {
  switch (sourceType.toLowerCase()) {
    case 'shopify':
      return ['graphql', 'json'];
    case 'woocommerce':
      return ['rest', 'json'];
    case 'rest':
      return ['json', 'openapi'];
    case 'ftp':
      return ['csv', 'json', 'xml'];
    case 'graphql':
      return ['graphql', 'json'];
    default:
      return ['json'];
  }
}
