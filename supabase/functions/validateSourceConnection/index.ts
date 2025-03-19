
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const { sourceType, config } = await req.json();
    
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
          JSON.stringify({ error: `Unsupported source type: ${sourceType}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function validateShopifyConnection(config: any) {
  const { storeName, clientId, accessToken } = config;
  
  if (!storeName || !accessToken) {
    return new Response(
      JSON.stringify({ error: "Missing required Shopify configuration" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
  
  // First attempt to detect latest API version
  let apiVersion = "2023-07"; // Fallback version
  
  try {
    const versionResponse = await fetch(`https://${storeName}.myshopify.com/admin/api/versions`, {
      headers: {
        "X-Shopify-Access-Token": accessToken
      }
    });
    
    if (versionResponse.ok) {
      const versionData = await versionResponse.json();
      if (versionData.supported_versions && versionData.supported_versions.length > 0) {
        apiVersion = versionData.supported_versions[0].handle;
      }
    }
  } catch (error) {
    console.error("Failed to auto-detect API version:", error);
    // Continue with fallback version
  }
  
  // Test connection with detected or fallback version
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
  
  try {
    const response = await fetch(shopifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query: testQuery })
    });
    
    const result = await response.json();
    
    if (result.errors) {
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
