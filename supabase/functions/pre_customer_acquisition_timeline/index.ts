
// pre_customer_acquisition_timeline/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors, successResponse, errorResponse } from './cors.ts';
import { ShopifyClient } from '../shopify/predefined/customers/pre_customer_acquisition_timeline/query.ts';
import { supabase } from '../_shared/supabaseClient.ts';

interface ShopifyCredentials {
  storeName: string;
  accessToken: string;
  api_version?: string;
}

serve(async (req: Request) => {
  console.log("Received request for customer acquisition timeline");
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Parse request body or use default parameters
    let credentials: ShopifyCredentials;
    let months = 12;
    
    if (req.method === 'POST') {
      try {
        const requestData = await req.json();
        
        // Get credentials from request or from database
        if (requestData.credentials) {
          credentials = requestData.credentials;
        } else if (requestData.sourceId) {
          // Get the Shopify source configuration from database
          const { data: sources, error: sourceError } = await supabase
            .from('sources')
            .select('*')
            .eq('id', requestData.sourceId)
            .eq('source_type', 'shopify')
            .limit(1);
          
          if (sourceError) {
            throw new Error(`Failed to fetch Shopify source: ${sourceError.message}`);
          }
          
          if (!sources || sources.length === 0) {
            throw new Error('No Shopify source found');
          }
          
          credentials = sources[0].config;
        } else {
          // If no credentials or sourceId provided, get the first Shopify source
          const { data: sources, error: sourceError } = await supabase
            .from('sources')
            .select('*')
            .eq('source_type', 'shopify')
            .limit(1);
          
          if (sourceError) {
            throw new Error(`Failed to fetch Shopify source: ${sourceError.message}`);
          }
          
          if (!sources || sources.length === 0) {
            throw new Error('No Shopify source found');
          }
          
          credentials = sources[0].config;
        }
        
        // Get months parameter if provided
        if (requestData.months && typeof requestData.months === 'number') {
          months = requestData.months;
        }
      } catch (error) {
        console.error("Error processing request:", error);
        return errorResponse(`Invalid request format: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // For GET requests, fetch the first Shopify source
      const { data: sources, error: sourceError } = await supabase
        .from('sources')
        .select('*')
        .eq('source_type', 'shopify')
        .limit(1);
      
      if (sourceError) {
        throw new Error(`Failed to fetch Shopify source: ${sourceError.message}`);
      }
      
      if (!sources || sources.length === 0) {
        throw new Error('No Shopify source found');
      }
      
      credentials = sources[0].config;
    }
    
    if (!credentials || !credentials.storeName || !credentials.accessToken) {
      console.error("Missing required Shopify credentials");
      return errorResponse('Missing required Shopify credentials');
    }
    
    console.log(`Executing query for customer acquisition timeline for store: ${credentials.storeName}, last ${months} months`);
    
    const client = new ShopifyClient(
      credentials.storeName,
      credentials.accessToken,
      credentials.api_version
    );
    
    const data = await client.executeCustomerAcquisitionQuery(months);
    
    console.log(`Successfully retrieved customer acquisition data`);
    
    return successResponse({ data });
  } catch (error) {
    console.error('Error in pre_customer_acquisition_timeline:', error);
    
    return errorResponse(
      'Failed to fetch customer acquisition timeline',
      error instanceof Error ? error.message : String(error)
    );
  }
});
