
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  console.log(`[validateSourceConnection] Request method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[validateSourceConnection] Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Log raw request for debugging
    const requestText = await req.text();
    console.log(`[validateSourceConnection] Raw request body: ${requestText.substring(0, 500)}...`);
    
    // Parse request body
    let bodyData;
    try {
      bodyData = JSON.parse(requestText);
    } catch (e) {
      console.error(`[validateSourceConnection] JSON parse error: ${e.message}`);
      return new Response(
        JSON.stringify({ success: false, error: `Invalid JSON in request: ${e.message}` }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    const { sourceType, config } = bodyData;
    
    console.log(`[validateSourceConnection] Processing request for sourceType: ${sourceType}`);
    console.log(`[validateSourceConnection] Config: ${JSON.stringify({
      ...config,
      accessToken: config?.accessToken ? "REDACTED" : undefined
    })}`);
    
    // Validate required parameters
    if (!sourceType || !config) {
      console.error("[validateSourceConnection] Missing required parameters");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters: sourceType or config" }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Handle different source types
    switch (sourceType) {
      case "shopify":
        return await validateShopifyConnection(config, corsHeaders);
      case "woocommerce":
        return await validateWooCommerceConnection(config, corsHeaders);
      case "ftp_sftp":
        return await validateFtpConnection(config, corsHeaders);
      case "custom_api":
        return await validateCustomApiConnection(config, corsHeaders);
      default:
        console.error(`[validateSourceConnection] Unsupported source type: ${sourceType}`);
        return new Response(
          JSON.stringify({ success: false, error: `Unsupported source type: ${sourceType}` }),
          { headers: corsHeaders, status: 400 }
        );
    }
  } catch (error) {
    console.error(`[validateSourceConnection] Unhandled error: ${error.message}`);
    console.error(error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`,
        stack: error.stack
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

async function validateShopifyConnection(config: any, corsHeaders: Record<string, string>) {
  console.log("[validateShopifyConnection] Starting Shopify validation");
  
  const { storeName, accessToken } = config;
  
  if (!storeName || !accessToken) {
    console.error("[validateShopifyConnection] Missing required Shopify configuration");
    return new Response(
      JSON.stringify({ success: false, error: "Missing required Shopify configuration: storeName or accessToken" }),
      { headers: corsHeaders, status: 400 }
    );
  }
  
  // First attempt to detect latest API version
  let apiVersion = "2023-07"; // Fallback version
  
  try {
    console.log(`[validateShopifyConnection] Attempting to fetch API versions for store: ${storeName}`);
    const versionEndpoint = `https://${storeName}.myshopify.com/admin/api/versions`;
    console.log(`[validateShopifyConnection] Version endpoint: ${versionEndpoint}`);
    
    const versionResponse = await fetch(versionEndpoint, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      }
    });
    
    if (!versionResponse.ok) {
      console.error(`[validateShopifyConnection] Version endpoint response not OK: ${versionResponse.status} ${versionResponse.statusText}`);
      const responseText = await versionResponse.text();
      console.error(`[validateShopifyConnection] Response body: ${responseText.substring(0, 500)}...`);
      
      // If we can't get the version, we'll try the connection with the fallback version
      console.log(`[validateShopifyConnection] Proceeding with fallback API version: ${apiVersion}`);
    } else {
      const versionData = await versionResponse.json();
      console.log(`[validateShopifyConnection] API versions response: ${JSON.stringify(versionData)}`);
      
      if (versionData.supported_versions && versionData.supported_versions.length > 0) {
        apiVersion = versionData.supported_versions[0].handle;
        console.log(`[validateShopifyConnection] Latest API version detected: ${apiVersion}`);
      }
    }
  } catch (error) {
    console.error(`[validateShopifyConnection] Failed to auto-detect API version: ${error.message}`);
    // Continue with fallback version
    console.log(`[validateShopifyConnection] Proceeding with fallback API version: ${apiVersion}`);
  }
  
  // Test connection with detected or fallback version
  const shopifyEndpoint = `https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
  console.log(`[validateShopifyConnection] GraphQL endpoint: ${shopifyEndpoint}`);
  
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
  
  try {
    console.log("[validateShopifyConnection] Making GraphQL request to Shopify");
    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: testQuery })
    });
    
    console.log(`[validateShopifyConnection] GraphQL response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[validateShopifyConnection] GraphQL error response: ${errorText.substring(0, 500)}...`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Connection failed: ${response.status} ${response.statusText}` 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    const result = await response.json();
    console.log(`[validateShopifyConnection] GraphQL response data: ${JSON.stringify(result)}`);
    
    if (result.errors) {
      console.error(`[validateShopifyConnection] GraphQL errors: ${JSON.stringify(result.errors)}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.errors[0].message 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Update config with detected API version
    const updatedConfig = {
      ...config,
      api_version: apiVersion
    };
    
    console.log("[validateShopifyConnection] Connection successful, returning updated config");
    
    // Connection successful
    return new Response(
      JSON.stringify({ 
        success: true,
        config: updatedConfig,
        shopInfo: result.data.shop
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error(`[validateShopifyConnection] Error connecting to Shopify: ${error.message}`);
    console.error(error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Connection failed: ${error.message}` 
      }),
      { headers: corsHeaders, status: 400 }
    );
  }
}

// Placeholder implementations for other source types
async function validateWooCommerceConnection(config: any, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ 
      success: true,
      config,
      message: "WooCommerce validation not yet implemented"
    }),
    { headers: corsHeaders }
  );
}

async function validateFtpConnection(config: any, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ 
      success: true,
      config,
      message: "FTP/SFTP validation not yet implemented"
    }),
    { headers: corsHeaders }
  );
}

async function validateCustomApiConnection(config: any, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ 
      success: true,
      config,
      message: "Custom API validation not yet implemented"
    }),
    { headers: corsHeaders }
  );
}
