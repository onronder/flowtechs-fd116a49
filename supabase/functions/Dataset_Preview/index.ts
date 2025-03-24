
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    console.log("Dataset_Preview function called");

    // Parse request
    let requestBody;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      requestBody = JSON.parse(text);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return errorResponse("Invalid JSON in request body", 400);
    }

    const { executionId, limit = 100 } = requestBody;
    
    if (!executionId) {
      console.error("Missing required parameter: executionId");
      return errorResponse("Missing required parameter: executionId", 400);
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return errorResponse("Server configuration error", 500);
    }

    // Get the auth token from request
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    // Use service role directly to simplify auth process - we'll later check if the user has access to the execution
    const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);
    
    // If there's an auth header, get the user ID for ownership check
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        
        if (userData?.user) {
          userId = userData.user.id;
          console.log(`Authenticated user: ${userId}`);
        } else {
          console.log("Auth getUser error or no user:", userError);
        }
      } catch (authError) {
        console.error("Error processing authentication:", authError);
      }
    }

    // Verify that execution exists
    const { data: executionCheck, error: executionError } = await supabase
      .from("dataset_executions")
      .select("id, user_id")
      .eq("id", executionId)
      .maybeSingle();

    if (executionError) {
      console.error("Error checking execution:", executionError);
      return errorResponse(`Database error: ${executionError.message}`, 500);
    }

    if (!executionCheck) {
      console.error("Execution not found");
      return errorResponse("Execution not found", 404);
    }

    // Now get the execution data
    // Modified query to avoid the template join that was causing issues
    const { data: execution, error: fetchError } = await supabase
      .from("dataset_executions")
      .select(`
        id, 
        status, 
        start_time, 
        end_time, 
        row_count, 
        execution_time_ms,
        error_message,
        metadata,
        data,
        dataset_id
      `)
      .eq("id", executionId)
      .single();

    if (fetchError) {
      console.error("Error fetching execution:", fetchError);
      return errorResponse(`Database error: ${fetchError.message}`, 500);
    }

    // Now fetch the dataset information separately to avoid join issues
    const { data: dataset, error: datasetError } = await supabase
      .from("user_datasets")
      .select("id, name, dataset_type, template_id")
      .eq("id", execution.dataset_id)
      .single();

    // Build dataset info object safely
    const datasetInfo = {
      id: dataset?.id || execution.dataset_id,
      name: dataset?.name || "Unknown Dataset",
      type: dataset?.dataset_type || "unknown",
      template: null // Initialize with null
    };

    // Only try to get template info if we have a template_id and avoid direct joins
    if (dataset?.template_id) {
      // Try query_templates first
      const { data: templateData } = await supabase
        .from("query_templates")
        .select("id, name")
        .eq("id", dataset.template_id)
        .maybeSingle();
        
      if (templateData) {
        datasetInfo.template = { name: templateData.name };
      } else {
        // Try dependent_query_templates if not found in query_templates
        const { data: depTemplateData } = await supabase
          .from("dependent_query_templates")
          .select("id, name")
          .eq("id", dataset.template_id)
          .maybeSingle();
          
        if (depTemplateData) {
          datasetInfo.template = { name: depTemplateData.name };
        }
      }
    }

    // Format response based on execution status
    const response: Record<string, any> = {
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count,
        executionTimeMs: execution.execution_time_ms,
        apiCallCount: execution.metadata?.api_call_count
      },
      dataset: datasetInfo,
      columns: [],
      error: execution.error_message
    };

    // Handle different execution states
    if (execution.status === "completed") {
      // Extract columns from data if available
      if (execution.data && Array.isArray(execution.data) && execution.data.length > 0) {
        const firstRow = execution.data[0];
        if (typeof firstRow === 'object' && firstRow !== null) {
          response.columns = Object.keys(firstRow).map(key => ({
            key,
            label: key
          }));
        }
      }

      // Set preview data - limiting to max 5 rows for initial preview
      const maxPreviewRows = Math.min(5, limit);
      response.preview = Array.isArray(execution.data) 
        ? execution.data.slice(0, maxPreviewRows) 
        : [];
      
      response.totalCount = execution.row_count || 0;
    } else {
      // Pending or running
      response.preview = [];
      response.totalCount = 0;
    }

    console.log(`Response for execution ${executionId}:`, {
      status: response.status,
      previewRows: response.preview?.length || 0,
      totalCount: response.totalCount
    });
    
    return successResponse(response);
  } catch (error) {
    console.error("Error in Dataset_Preview:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
