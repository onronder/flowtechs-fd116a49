
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sourceId } = await req.json();
    
    if (!sourceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing sourceId parameter" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log(`[testSourceConnection] Testing connection for source: ${sourceId}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the source from the database
    const { data: source, error: sourceError } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) {
      console.error(`[testSourceConnection] Source not found: ${sourceError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: `Source not found: ${sourceError.message}` }),
        { headers: corsHeaders, status: 404 }
      );
    }

    console.log(`[testSourceConnection] Testing ${source.source_type} source: ${source.name}`);

    // Test the source based on its type
    let testResult;
    
    switch (source.source_type) {
      case 'shopify':
        // Test Shopify connection
        const shopifyTestData = {
          storeName: source.config.storeName,
          accessToken: source.config.accessToken,
          apiVersion: source.config.api_version || "2023-01"
        };
        
        // Construct the GraphQL endpoint URL
        const shopifyEndpoint = `https://${shopifyTestData.storeName}.myshopify.com/admin/api/${shopifyTestData.apiVersion}/graphql.json`;
        
        // Simple GraphQL query to test the connection
        const query = `{ shop { name } }`;
        
        console.log(`[testSourceConnection] Testing Shopify GraphQL API at: ${shopifyEndpoint}`);
        
        const response = await fetch(shopifyEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': shopifyTestData.accessToken
          },
          body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[testSourceConnection] Shopify API error: ${response.status} ${errorText}`);
          testResult = { 
            success: false, 
            error: `Failed to connect to Shopify API: ${response.status} ${errorText}` 
          };
        } else {
          const data = await response.json();
          
          if (data.errors) {
            console.error(`[testSourceConnection] Shopify GraphQL error: ${JSON.stringify(data.errors)}`);
            testResult = { 
              success: false, 
              error: `GraphQL error: ${data.errors[0].message}` 
            };
          } else {
            console.log(`[testSourceConnection] Successfully connected to Shopify store: ${data.data.shop.name}`);
            
            // Update last_validated_at timestamp
            await supabaseAdmin
              .from("sources")
              .update({ 
                last_validated_at: new Date().toISOString(),
                is_active: true
              })
              .eq("id", sourceId);
              
            testResult = { 
              success: true, 
              message: `Successfully connected to Shopify store: ${data.data.shop.name}` 
            };
          }
        }
        break;
        
      case 'woocommerce':
        // Basic placeholder for WooCommerce testing
        testResult = { 
          success: false, 
          error: "WooCommerce connection testing not yet implemented" 
        };
        break;
        
      case 'ftp_sftp':
        // Basic placeholder for FTP/SFTP testing
        testResult = { 
          success: false, 
          error: "FTP/SFTP connection testing not yet implemented" 
        };
        break;
        
      case 'custom_api':
        // Basic placeholder for Custom API testing
        testResult = { 
          success: false, 
          error: "Custom API connection testing not yet implemented" 
        };
        break;
        
      default:
        testResult = { 
          success: false, 
          error: `Unsupported source type: ${source.source_type}` 
        };
    }

    console.log(`[testSourceConnection] Test result: ${JSON.stringify(testResult)}`);
    
    return new Response(
      JSON.stringify(testResult),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error(`[testSourceConnection] Unhandled error: ${error.message}`);
    console.error(error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unexpected error occurred" 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
