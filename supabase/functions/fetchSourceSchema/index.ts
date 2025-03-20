
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
    const { sourceId, forceUpdate = false } = await req.json();
    console.log(`Processing fetchSourceSchema request for sourceId: ${sourceId}, forceUpdate: ${forceUpdate}`);
    
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
    
    // Check if we need to update the schema
    if (!forceUpdate) {
      // Check if we already have a schema for this version
      const { data: existingSchema } = await supabaseClient
        .from("source_schemas")
        .select("created_at")
        .eq("source_id", sourceId)
        .eq("api_version", source.config.api_version)
        .single();
      
      if (existingSchema) {
        console.log(`Schema already exists for version ${source.config.api_version}, created at ${existingSchema.created_at}`);
        // Schema already exists
        return successResponse({ 
          message: "Schema already exists",
          cached: true
        });
      }
    }
    
    // Fetch schema based on source type
    switch (source.source_type) {
      case "shopify":
        return await fetchShopifySchema(source, supabaseClient, forceUpdate);
      // Add cases for other source types
      default:
        return errorResponse(`Schema fetching not implemented for source type: ${source.source_type}`);
    }
  } catch (error) {
    console.error("Error in fetchSourceSchema:", error);
    return errorResponse(`Schema fetch failed: ${error.message}`);
  }
});
