
import { corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";

/**
 * Validates a WooCommerce connection
 * @param config The WooCommerce connection configuration
 * @returns Response with validation results
 */
export async function validateWooCommerceConnection(config: any): Promise<Response> {
  console.log("[validateWooCommerceConnection] Starting WooCommerce validation");
  
  const { siteUrl, consumerKey, consumerSecret } = config;
  
  if (!siteUrl || !consumerKey || !consumerSecret) {
    console.error("[validateWooCommerceConnection] Missing required WooCommerce configuration");
    return errorResponse("Missing required WooCommerce configuration: siteUrl, consumerKey, or consumerSecret");
  }
  
  try {
    // Test connection to WooCommerce API (simple check if site exists and credentials work)
    const wcEndpoint = `${siteUrl}/wp-json/wc/v3/products?per_page=1`;
    
    console.log(`[validateWooCommerceConnection] Testing connection to: ${wcEndpoint}`);
    
    const response = await fetch(wcEndpoint, {
      headers: {
        Authorization: 'Basic ' + btoa(`${consumerKey}:${consumerSecret}`)
      }
    });
    
    console.log(`[validateWooCommerceConnection] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[validateWooCommerceConnection] Error response: ${errorText.substring(0, 500)}...`);
      
      return errorResponse(`Connection failed: ${response.status} ${response.statusText}`);
    }
    
    const products = await response.json();
    console.log(`[validateWooCommerceConnection] Connection successful, found products: ${JSON.stringify(products.length)}`);
    
    // Return updated config with API version
    return successResponse({
      config: {
        ...config,
        api_version: "v3" // WooCommerce API version
      },
      shopInfo: {
        name: siteUrl,
        connectionStatus: "Connected"
      }
    });
  } catch (error) {
    console.error(`[validateWooCommerceConnection] Error connecting to WooCommerce: ${error.message}`);
    console.error(error.stack);
    
    return errorResponse(`Connection failed: ${error.message}`);
  }
}
