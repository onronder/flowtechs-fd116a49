import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createShopifyApiClient } from '../_shared/shopify.ts';

// Function to handle dataset execution
async function handleDatasetExecution(req: Request): Promise<Response> {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract data from the request body
    const { datasetId, sourceCredentials } = await req.json();

    // Validate datasetId
    if (!datasetId) {
      console.error('Missing datasetId');
      return new Response(JSON.stringify({ error: 'Missing datasetId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log dataset execution start
    console.log(`Starting dataset execution for datasetId: ${datasetId}`);

    // Fetch dataset details from Supabase
    const { data: dataset, error: datasetError } = await supabase
      .from('user_datasets')
      .select('*, template:template_id(*), source:source_id(*)')
      .eq('id', datasetId)
      .single();

    if (datasetError) {
      console.error('Failed to fetch dataset:', datasetError);
      return new Response(JSON.stringify({ error: 'Failed to fetch dataset' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dataset) {
      console.error('Dataset not found');
      return new Response(JSON.stringify({ error: 'Dataset not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log dataset details
    console.log(`Dataset details: ${JSON.stringify({
      id: dataset.id,
      name: dataset.name,
      type: dataset.dataset_type,
      templateId: dataset.template_id,
      sourceId: dataset.source_id,
    })}`);

    // Validate dataset template
    if (!dataset.template) {
      console.error('Dataset template not found');
      return new Response(JSON.stringify({ error: 'Dataset template not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate dataset source
    if (!dataset.source) {
      console.error('Dataset source not found');
      return new Response(JSON.stringify({ error: 'Dataset source not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log template and source details
    console.log(`Template details: ${JSON.stringify({
      id: dataset.template.id,
      name: dataset.template.name,
      query: dataset.template.query,
    })}`);
    console.log(`Source details: ${JSON.stringify({
      id: dataset.source.id,
      name: dataset.source.name,
      type: dataset.source.source_type,
      config: dataset.source.config,
    })}`);

    // Create a new execution record in Supabase
    const { data: execution, error: executionError } = await supabase
      .from('dataset_executions')
      .insert({
        dataset_id: datasetId,
        status: 'pending',
        start_time: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (executionError) {
      console.error('Failed to create execution:', executionError);
      return new Response(JSON.stringify({ error: 'Failed to create execution' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log execution details
    console.log(`Created execution record with ID: ${execution.id}`);

    // Construct Shopify API client based on source type
    let shopify;
    if (dataset.source.source_type === 'shopify') {
      if (!sourceCredentials) {
        console.error('Missing Shopify credentials');
        return new Response(JSON.stringify({ error: 'Missing Shopify credentials' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      shopify = createShopifyApiClient(sourceCredentials);
    } else {
      console.error(`Unsupported source type: ${dataset.source.source_type}`);
      return new Response(JSON.stringify({ error: `Unsupported source type: ${dataset.source.source_type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute the dataset query
    try {
      // Validate shopify object
      if (!shopify) {
        console.error('Shopify object is not initialized');
        return new Response(JSON.stringify({ error: 'Shopify object is not initialized' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate dataset template query
      if (!dataset.template.query) {
        console.error('Missing or invalid template query');
        return new Response(JSON.stringify({ error: 'Missing or invalid template query' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log query execution start
      console.log(`Executing query: ${dataset.template.query}`);

      const result = await shopify.query({
        data: dataset.template.query,
      });

      // Log query execution end
      console.log('Query executed successfully');

      // Update the execution record with the results
      const { error: updateError } = await supabase
        .from('dataset_executions')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          row_count: result?.data ? Object.keys(result.data).length : 0,
        })
        .eq('id', execution.id);

      if (updateError) {
        console.error('Failed to update execution:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update execution' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log successful execution
      console.log(`Dataset execution completed successfully for executionId: ${execution.id}`);

      // Return the execution ID
      return new Response(
        JSON.stringify({ executionId: execution.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (queryError) {
      console.error('Query execution failed:', queryError);

      // Update the execution record with the error
      const { error: updateError } = await supabase
        .from('dataset_executions')
        .update({
          status: 'failed',
          end_time: new Date().toISOString(),
          error_message: queryError.message,
        })
        .eq('id', execution.id);

      if (updateError) {
        console.error('Failed to update execution with error:', updateError);
      }

      return new Response(JSON.stringify({ error: 'Query execution failed', details: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Unexpected error', details: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Start the server
serve(handleDatasetExecution);
