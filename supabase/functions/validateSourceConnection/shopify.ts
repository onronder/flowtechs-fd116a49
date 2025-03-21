
import { corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";

/**
 * Validates a Shopify connection
 * @param config The Shopify connection configuration
 * @returns Response with validation results
 */
export async function validateShopifyConnection(config: any): Promise<Response> {
  console.log("[validateShopifyConnection] Starting Shopify validation");
  
  const { storeName, accessToken, clientId, apiSecret, api_version } = config;
  
  if (!storeName || !accessToken || !apiSecret) {
    console.error("[validateShopifyConnection] Missing required Shopify configuration");
    return errorResponse("Missing required Shopify configuration: storeName, accessToken or apiSecret");
  }
  
  try {
    // Properly format the shop URL
    const shopUrl = `https://${storeName}.myshopify.com`;
    console.log(`[validateShopifyConnection] Shop URL: ${shopUrl}`);
    
    // If the API version is provided, use it; otherwise detect it
    // Note: We expect the frontend to have already detected the version
    const apiVersion = api_version || "2025-01";
    console.log(`[validateShopifyConnection] Using API version: ${apiVersion}`);
    
    // Test GraphQL API to verify credentials
    const graphqlEndpoint = `${shopUrl}/admin/api/${apiVersion}/graphql.json`;
    
    const testQuery = `
      query {
        shop {
          name
          plan {
            displayName
          }
        }
      }
    `;
    
    console.log(`[validateShopifyConnection] Testing GraphQL endpoint: ${graphqlEndpoint}`);
    
    const graphqlResponse = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: testQuery })
    });
    
    const responseStatus = graphqlResponse.status;
    console.log(`[validateShopifyConnection] GraphQL response status: ${responseStatus}`);
    
    // Handle various HTTP responses
    if (responseStatus === 401 || responseStatus === 403) {
      console.error(`[validateShopifyConnection] Authentication error: ${responseStatus}`);
      return errorResponse("Authentication failed. Please check your access token.");
    }
    
    if (!graphqlResponse.ok) {
      console.error(`[validateShopifyConnection] GraphQL error: ${responseStatus} ${graphqlResponse.statusText}`);
      const errorText = await graphqlResponse.text();
      console.error(`[validateShopifyConnection] GraphQL error response: ${errorText.substring(0, 500)}...`);
      
      return errorResponse(`Connection failed: ${responseStatus} ${graphqlResponse.statusText}`);
    }
    
    const result = await graphqlResponse.json();
    console.log(`[validateShopifyConnection] GraphQL response: ${JSON.stringify(result)}`);
    
    if (result.errors) {
      console.error(`[validateShopifyConnection] GraphQL errors: ${JSON.stringify(result.errors)}`);
      return errorResponse(result.errors[0].message);
    }
    
    // Return the updated config with current API version
    const updatedConfig = {
      ...config,
      api_version: apiVersion
    };
    
    console.log(`[validateShopifyConnection] Connection successful, using API version: ${apiVersion}`);
    
    // Connection successful
    return successResponse({
      success: true,
      config: updatedConfig,
      shopInfo: result.data.shop
    });
  } catch (error) {
    console.error(`[validateShopifyConnection] Error connecting to Shopify: ${error.message}`);
    console.error(error.stack);
    
    return errorResponse(`Connection failed: ${error.message}`);
  }
}
