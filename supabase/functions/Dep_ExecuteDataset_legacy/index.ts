import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { datasetId } = await req.json()

    if (!datasetId) {
      throw new Error('datasetId is required')
    }

    // 1. Get dataset details
    const { data: dataset, error: datasetError } = await supabase
      .from('user_datasets')
      .select('*')
      .eq('id', datasetId)
      .single()

    if (datasetError) {
      throw new Error(datasetError.message)
    }

    if (!dataset) {
      throw new Error('Dataset not found')
    }

    // 2. Get template details
    const { data: template, error: templateError } = await supabase
      .from('dataset_templates')
      .select('*')
      .eq('id', dataset.template_id)
      .single()

    if (templateError) {
      throw new Error(templateError.message)
    }

    if (!template) {
      throw new Error('Template not found')
    }

    // 3. Execute the query
    const { data, error } = await supabase.from(dataset.table_name)
      .select(template.query)

    if (error) {
      throw new Error(error.message)
    }

    // 4. Create execution record
    const { data: execution, error: executionError } = await supabase
      .from('dataset_executions')
      .insert({
        dataset_id: datasetId,
        status: 'completed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        row_count: data.length,
      })
      .select()
      .single()

    if (executionError) {
      throw new Error(executionError.message)
    }

    // 5. Return the data
    return new Response(
      JSON.stringify({ data, executionId: execution.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
