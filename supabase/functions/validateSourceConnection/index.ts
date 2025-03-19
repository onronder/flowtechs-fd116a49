
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const { sourceType, config } = await req.json();
    
    console.log("Request received:", JSON.stringify({ 
      method: req.method, 
      sourceType, 
      config: { ...config, accessToken: "REDACTED" } 
    }));
    
    // Handle different source types
    switch (sourceType) {
      case "shopify":
        return await validateShopifyConnection(config);
      case "woocommerce":
        return await validateWooCommerceConnection(config);
      case "ftp_sftp":
        return await validateFtpConnection(config);
      case "custom_api":
        return await validateCustomApiConnection(config);
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unsupported source type: ${sourceType}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function validateShopifyConnection(config: any) {
  const { storeName, accessToken } = config;
  
  if (!storeName || !accessToken) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required Shopify configuration" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
  
  // First attempt to detect latest API version
  let apiVersion = "2023-07"; // Fallback version
  
  try {
    console.log(`Attempting to fetch API versions for store: ${storeName}`);
    const versionEndpoint = `https://${storeName}.myshopify.com/admin/api/versions`;
    console.log(`Version endpoint: ${versionEndpoint}`);
    
    const versionResponse = await fetch(versionEndpoint, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      }
    });
    
    if (!versionResponse.ok) {
      console.error(`Version endpoint response not OK: ${versionResponse.status} ${versionResponse.statusText}`);
      const responseText = await versionResponse.text();
      console.error(`Response body: ${responseText.substring(0, 500)}...`);
      
      // If we can't get the version, we'll try the connection with the fallback version
      console.log(`Proceeding with fallback API version: ${apiVersion}`);
    } else {
      const versionData = await versionResponse.json();
      console.log("API versions response:", JSON.stringify(versionData));
      
      if (versionData.supported_versions && versionData.supported_versions.length > 0) {
        apiVersion = versionData.supported_versions[0].handle;
        console.log(`Latest API version detected: ${apiVersion}`);
      }
    }
  } catch (error) {
    console.error("Failed to auto-detect API version:", error);
    // Continue with fallback version
    console.log(`Proceeding with fallback API version: ${apiVersion}`);
  }
  
  // Test connection with detected or fallback version
  const shopifyEndpoint = `https://${storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
  console.log(`GraphQL endpoint: ${shopifyEndpoint}`);
  
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
    console.log("Making GraphQL request to Shopify");
    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: testQuery })
    });
    
    console.log(`GraphQL response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GraphQL error response: ${errorText.substring(0, 500)}...`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Connection failed: ${response.status} ${response.statusText}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const result = await response.json();
    console.log("GraphQL response data:", JSON.stringify(result));
    
    if (result.errors) {
      console.error("GraphQL errors:", JSON.stringify(result.errors));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.errors[0].message 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Update config with detected API version
    const updatedConfig = {
      ...config,
      api_version: apiVersion
    };
    
    console.log("Connection successful, returning updated config");
    
    // Connection successful
    return new Response(
      JSON.stringify({ 
        success: true,
        config: updatedConfig,
        shopInfo: result.data.shop
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error connecting to Shopify:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Connection failed: ${error.message}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
}

// Placeholder implementations for other source types
async function validateWooCommerceConnection(config: any) {
  return new Response(
    JSON.stringify({ 
      success: true,
      config,
      message: "WooCommerce validation not yet implemented"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function validateFtpConnection(config: any) {
  return new Response(
    JSON.stringify({ 
      success: true,
      config,
      message: "FTP/SFTP validation not yet implemented"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function validateCustomApiConnection(config: any) {
  return new Response(
    JSON.stringify({ 
      success: true,
      config,
      message: "Custom API validation not yet implemented"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
