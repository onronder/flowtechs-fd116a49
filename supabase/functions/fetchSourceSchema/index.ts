
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsHeaders, errorResponse, successResponse } from "../_shared/cors.ts";
import { fetchShopifySchema } from "./shopify.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }
  
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return errorResponse("Invalid JSON in request body");
    }
    
    const { sourceId, forceUpdate = false } = body;
    console.log(`Processing fetchSourceSchema request for sourceId: ${sourceId}, forceUpdate: ${forceUpdate}`);
    
    if (!sourceId) {
      console.error("Missing sourceId in request");
      return errorResponse("Missing sourceId in request");
    }
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    // Get source details
    const { data: source, error: sourceError } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
      
    if (sourceError) {
      console.error("Error fetching source:", sourceError);
      return errorResponse(`Error fetching source: ${sourceError.message}`);
    }

    console.log(`Source found: type=${source.source_type}, name=${source.name}`);
    
    // Validate that config exists
    if (!source.config) {
      console.error("Source has no configuration");
      return errorResponse("Source has no configuration");
    }
    
    // Check source type-specific validation
    switch (source.source_type) {
      case "shopify":
        // Check required Shopify fields
        const { storeName, accessToken } = source.config;
        if (!storeName || !accessToken) {
          const missing = [];
          if (!storeName) missing.push("storeName");
          if (!accessToken) missing.push("accessToken");
          
          console.error(`Missing required Shopify configuration: ${missing.join(", ")}`);
          return errorResponse(`Missing required Shopify configuration: ${missing.join(", ")}`);
        }
        
        // Process Shopify source
        return await fetchShopifySchema(source, supabaseClient, forceUpdate);
        
      // Add cases for other source types
      default:
        return errorResponse(`Schema fetching not implemented for source type: ${source.source_type}`);
    }
  } catch (error) {
    console.error("Error in fetchSourceSchema:", error);
    return errorResponse(`Schema fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
