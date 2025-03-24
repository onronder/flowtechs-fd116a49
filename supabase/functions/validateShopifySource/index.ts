
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  console.log("[validateShopifySource] Request method:", req.method);
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  try {
    const body = await req.json();
    const { storeName, clientId, apiSecret, accessToken } = body;
    
    console.log(`[validateShopifySource] Validating Shopify store: ${storeName}`);
    
    if (!storeName || !accessToken || !apiSecret) {
      console.error("[validateShopifySource] Missing required parameters");
      return errorResponse("Missing required parameters: storeName, accessToken or apiSecret");
    }
    
    // Step 1: Detect latest Shopify API version
    let apiVersion = "2024-04"; // Default fallback version - updated to more recent version
    
    try {
      console.log(`[validateShopifySource] Detecting latest API version for: ${storeName}`);
      const versionResponse = await fetch(
        `https://${storeName}.myshopify.com/admin/api/versions`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (versionResponse.ok) {
        const versionData = await versionResponse.json();
        console.log(`[validateShopifySource] Available versions:`, JSON.stringify(versionData));
        
        if (versionData.supported_versions && versionData.supported_versions.length > 0) {
          apiVersion = versionData.supported_versions[0].handle;
          console.log(`[validateShopifySource] Detected latest API version: ${apiVersion}`);
        }
      } else {
        console.warn(`[validateShopifySource] Failed to detect version: ${versionResponse.status} ${versionResponse.statusText}`);
        // Continue with fallback version
      }
    } catch (error) {
      console.error("[validateShopifySource] Error detecting API version:", error);
      // Continue with fallback version
    }
    
    // Step 2: Test connection with GraphQL
    console.log(`[validateShopifySource] Testing GraphQL connection with version: ${apiVersion}`);
    const shopifyEndpoint = `https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    
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
    
    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: testQuery })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[validateShopifySource] Shopify API error: ${response.status} ${errorText.substring(0, 200)}`);
      return errorResponse(`Shopify API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error(`[validateShopifySource] GraphQL errors:`, result.errors);
      return errorResponse(`GraphQL error: ${result.errors[0].message}`);
    }
    
    console.log(`[validateShopifySource] Connection successful for store: ${storeName}`);
    
    // Success - return the results with detected version
    return successResponse({
      success: true,
      config: {
        storeName,
        clientId,
        apiSecret,
        accessToken,
        api_version: apiVersion
      },
      shopInfo: result.data.shop
    });
  } catch (error) {
    console.error("[validateShopifySource] Unhandled error:", error);
    return errorResponse(`Server error: ${error.message}`);
  }
});
