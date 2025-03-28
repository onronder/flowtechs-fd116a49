
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runDatasetJob } from "./execute.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request data
    const requestData = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const datasetId = url.searchParams.get('dataset_id') || requestData.datasetId;

    if (!datasetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing dataset_id parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Starting dataset job execution for dataset ID: ${datasetId}`);
    
    // Execute the dataset job
    const result = await runDatasetJob(datasetId);
    
    // Return successful response
    return new Response(
      JSON.stringify({ success: true, executionId: result.executionId }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('Dataset Job Error:', err);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || 'Unknown error occurred'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
