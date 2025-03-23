
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    console.log("Dataset_Preview request received");
    
    // Parse the request body
    let body;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      
      if (!text || text.trim() === '') {
        return errorResponse("Empty request body", 400);
      }
      
      try {
        body = JSON.parse(text);
        console.log("Parsed request body:", JSON.stringify(body));
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        return errorResponse("Invalid JSON: " + parseError.message, 400);
      }
    } catch (error) {
      console.error("Error reading request body:", error);
      return errorResponse("Failed to read request body", 400);
    }
    
    // Validate required parameters
    const { executionId, limit = 10 } = body;

    if (!executionId) {
      console.error("Missing executionId parameter");
      return errorResponse("Missing required parameter: executionId", 400);
    }

    // Initialize Supabase client with authorization from the request
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get the user ID for security checks
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return errorResponse("Authentication required", 401);
    }

    console.log(`Fetching execution ID: ${executionId} for user: ${user.id}`);
    
    // Get execution data
    const { data: execution, error: executionError } = await supabaseClient
      .from("dataset_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (executionError) {
      console.error("Error fetching execution:", executionError);
      return errorResponse(`Execution not found: ${executionError.message}`, 404);
    }
    
    console.log(`Found execution with status: ${execution.status}`);

    // Return appropriate data based on execution status without additional DB lookups 
    // if the execution is still in progress or has failed
    if (execution.status === "running" || execution.status === "pending") {
      return successResponse({
        status: execution.status,
        message: "Dataset execution is still in progress"
      });
    }

    if (execution.status === "failed") {
      return successResponse({
        status: "failed",
        error: execution.error_message || "Dataset execution failed",
        message: "Dataset execution failed"
      });
    }

    // Only fetch the dataset details if execution is successful
    // Using a direct query without relying on relations or schema cache
    const datasetQuery = `
      SELECT id, name, description, dataset_type, template_id, source_id
      FROM user_datasets
      WHERE id = '${execution.dataset_id}'
      AND user_id = '${user.id}'
      LIMIT 1
    `;
    
    console.log("Executing direct dataset query...");
    
    const { data: datasetResults, error: datasetQueryError } = await supabaseClient.rpc(
      'execute_sql_query',
      { query: datasetQuery }
    );

    if (datasetQueryError || !datasetResults || datasetResults.length === 0) {
      console.error("Error fetching dataset:", datasetQueryError || "No dataset found");
      return errorResponse("Dataset not found or access denied", 404);
    }
    
    const dataset = datasetResults[0];
    console.log(`Found dataset: ${dataset.name} (${dataset.id}), type: ${dataset.dataset_type}`);
    
    // Get template details if needed
    let template = null;
    if (dataset.template_id) {
      const templateTable = dataset.dataset_type === "dependent" 
        ? "dependent_query_templates" 
        : "query_templates";
      
      console.log(`Fetching template from ${templateTable} with ID: ${dataset.template_id}`);
      
      const templateQuery = `
        SELECT id, name, display_name
        FROM ${templateTable}
        WHERE id = '${dataset.template_id}'
        LIMIT 1
      `;
      
      try {
        const { data: templateResults, error: templateQueryError } = await supabaseClient.rpc(
          'execute_sql_query',
          { query: templateQuery }
        );
        
        if (!templateQueryError && templateResults && templateResults.length > 0) {
          template = templateResults[0];
          console.log("Found template:", template.id, template.name || template.display_name);
        } else {
          console.log("Template not found, continuing without it:", templateQueryError?.message);
        }
      } catch (templateFetchError) {
        console.error("Error fetching template:", templateFetchError);
        // Continue without template data
      }
    }

    // Process the data
    const data = execution.data || [];
    
    // Handle different data formats
    let preview = [];
    if (Array.isArray(data)) {
      preview = data.slice(0, limit);
    } else if (typeof data === 'object' && data !== null) {
      if (data.results && Array.isArray(data.results)) {
        preview = data.results.slice(0, limit);
      } else {
        preview = [data];
      }
    }
    
    // Get dataset columns (from first record)
    const columns = preview.length > 0
      ? Object.keys(preview[0]).map(key => ({ key, label: key }))
      : [];

    return successResponse({
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count || (Array.isArray(data) ? data.length : 1),
        executionTimeMs: execution.execution_time_ms,
        apiCallCount: execution.api_call_count
      },
      dataset: {
        id: dataset.id,
        name: dataset.name,
        type: dataset.dataset_type,
        template: template ? {
          id: template.id,
          name: template.name || template.display_name
        } : null
      },
      columns,
      preview,
      totalCount: execution.row_count || (Array.isArray(data) ? data.length : 1)
    });
  } catch (error) {
    console.error("Error in Dataset_Preview:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
