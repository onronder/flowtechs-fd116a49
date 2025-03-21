
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, corsHeaders, errorResponse } from "../_shared/cors.ts";
import { validateShopifyConnection } from "./shopify.ts";
import { validateWooCommerceConnection } from "./woocommerce.ts";
import { validateFtpConnection } from "./ftp.ts";
import { validateCustomApiConnection } from "./custom_api.ts";

serve(async (req) => {
  console.log(`[validateSourceConnection] Request method: ${req.method}`);
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  try {
    // Parse request body
    const requestText = await req.text();
    console.log(`[validateSourceConnection] Raw request body: ${requestText.substring(0, 500)}...`);
    
    let bodyData;
    try {
      bodyData = JSON.parse(requestText);
    } catch (e) {
      console.error(`[validateSourceConnection] JSON parse error: ${e.message}`);
      return errorResponse(`Invalid JSON in request: ${e.message}`);
    }
    
    const { sourceType, config } = bodyData;
    
    console.log(`[validateSourceConnection] Processing request for sourceType: ${sourceType}`);
    console.log(`[validateSourceConnection] Config: ${JSON.stringify({
      ...config,
      accessToken: config?.accessToken ? "REDACTED" : undefined,
      apiKey: config?.apiKey ? "REDACTED" : undefined,
      apiSecret: config?.apiSecret ? "REDACTED" : undefined,
      password: config?.password ? "REDACTED" : undefined
    })}`);
    
    // Validate required parameters
    if (!sourceType || !config) {
      console.error("[validateSourceConnection] Missing required parameters");
      return errorResponse("Missing required parameters: sourceType or config");
    }
    
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
        console.error(`[validateSourceConnection] Unsupported source type: ${sourceType}`);
        return errorResponse(`Unsupported source type: ${sourceType}`);
    }
  } catch (error) {
    console.error(`[validateSourceConnection] Unhandled error: ${error.message}`);
    console.error(error.stack);
    
    return errorResponse(`Server error: ${error.message}`, 500);
  }
});
