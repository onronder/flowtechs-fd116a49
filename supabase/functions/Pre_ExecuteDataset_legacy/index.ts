import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PREDEFINED_DATASET_TEMPLATE_ID = 'a299f61c-416f-4b3f-b349-1c2c8c7c4a4e';

// Function to determine if the dataset is a predefined dataset
async function isPredefinedDataset(datasetId: string, supabaseClient: any): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient
      .from('user_datasets')
      .select('template_id')
      .eq('id', datasetId)
      .single();

    if (error) {
      console.error('Error fetching dataset template ID:', error);
      return false; // Assume not predefined if there's an error
    }

    // Check if the template_id matches the predefined dataset template ID
    return data?.template_id === PREDEFINED_DATASET_TEMPLATE_ID;
  } catch (error) {
    console.error('Error checking dataset type:', error);
    return false; // Assume not predefined if there's an error
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Extract the dataset ID from the request body
    const { datasetId } = await req.json();

    // Check if the dataset ID is provided
    if (!datasetId) {
      console.error('Dataset ID is missing in the request body.');
      return new Response(JSON.stringify({ error: 'Dataset ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the dataset is a predefined dataset
    const isPredefined = await isPredefinedDataset(datasetId, supabaseClient);

    // If it's a predefined dataset, return an error
    if (isPredefined) {
      console.warn(`Execution blocked: Dataset ${datasetId} is a predefined dataset.`);
      return new Response(
        JSON.stringify({
          error: 'Execution blocked: Predefined datasets cannot be executed directly.',
        }),
        {
          status: 403, // Forbidden
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If it's not a predefined dataset, proceed with the execution
    console.log(`Execution allowed: Dataset ${datasetId} is not a predefined dataset. Proceeding...`);
    return new Response(JSON.stringify({ message: 'Execution allowed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
