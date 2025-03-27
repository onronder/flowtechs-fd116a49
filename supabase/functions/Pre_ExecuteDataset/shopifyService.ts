
/**
 * Shopify service - main entry point for Shopify API operations
 * This file has been refactored from a monolithic service into modular components
 */

// Import all necessary Shopify service modules
import { fetchPaginatedData } from './services/shopifyClient.ts';
import { getDataPath } from './services/shopifyDataPathUtils.ts';
import { extractIds } from './services/idExtractionService.ts';
import { executeSecondaryQueries } from './services/shopifyQueryService.ts';

// Re-export all services for backward compatibility
export {
  fetchPaginatedData,
  getDataPath,
  extractIds,
  executeSecondaryQueries
};
