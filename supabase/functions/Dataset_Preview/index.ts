
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
    
    // Get execution data directly with detailed logging
    console.log("Querying dataset_executions table...");
    const { data: execution, error: executionError } = await supabaseClient
      .from("dataset_executions")
      .select("*")
      .eq("id", executionId)
      .eq("user_id", user.id)
      .single();

    if (executionError) {
      console.error("Error fetching execution:", executionError);
      return errorResponse(`Execution not found: ${executionError.message}`, 404);
    }
    
    console.log(`Found execution with status: ${execution.status}`);
    console.log(`Execution data column type: ${typeof execution.data}`);
    console.log(`Execution data length: ${execution.data ? (Array.isArray(execution.data) ? execution.data.length : 'Not an array') : 'null or undefined'}`);
    
    if (execution.data === null || execution.data === undefined) {
      console.log("Execution data is null or undefined");
      
      // Check if the execution is still in progress
      if (execution.status === "running" || execution.status === "pending") {
        return successResponse({
          status: execution.status,
          message: "Dataset execution is still in progress"
        });
      }
      
      // For failed executions, provide detailed error info
      if (execution.status === "failed") {
        console.log("Execution failed, error message:", execution.error_message);
        return successResponse({
          status: "failed",
          error: execution.error_message || "Dataset execution failed without data",
          message: "Dataset execution failed",
          debug: {
            executionId: execution.id,
            datasetId: execution.dataset_id,
            startTime: execution.start_time,
            endTime: execution.end_time
          }
        });
      }
      
      // Handle abnormal case: status is "completed" but data is null
      if (execution.status === "completed") {
        console.log("WARNING: Execution status is 'completed' but data is null");
        
        // Try to get raw execution data directly using RPC
        try {
          console.log("Attempting to retrieve execution data using direct query...");
          const { data: rawData, error: rawError } = await supabaseClient.rpc(
            'get_execution_data',
            { execution_id: executionId }
          );
          
          if (rawError) {
            console.error("Direct query error:", rawError);
          } else if (rawData) {
            console.log("Direct query successful, data retrieved");
            execution.data = rawData;
          }
        } catch (directQueryError) {
          console.error("Failed to retrieve data with direct query:", directQueryError);
        }
        
        // If still no data, return error
        if (!execution.data) {
          return errorResponse("Execution marked as completed but contains no data", 500);
        }
      }
    }

    // Get dataset without using relationships
    console.log(`Fetching dataset info for dataset ID: ${execution.dataset_id}`);
    const { data: dataset, error: datasetError } = await supabaseClient
      .from("user_datasets")
      .select("id, name, description, dataset_type, template_id, source_id")
      .eq("id", execution.dataset_id)
      .eq("user_id", user.id)
      .single();

    if (datasetError) {
      console.error("Error fetching dataset:", datasetError);
      return errorResponse(`Dataset not found: ${datasetError.message}`, 404);
    }
    
    console.log(`Found dataset: ${dataset.name} (${dataset.id}), type: ${dataset.dataset_type}`);
    
    // Get template details if needed, safely handle missing relationships
    let template = null;
    if (dataset.template_id) {
      // Determine which template table to use based on dataset type, with fallback
      let templateTable = "query_templates";
      if (dataset.dataset_type === "dependent") {
        templateTable = "dependent_query_templates";
      }
      
      console.log(`Attempting to fetch template from ${templateTable} with ID: ${dataset.template_id}`);
      
      try {
        const { data: templateData, error: templateError } = await supabaseClient
          .from(templateTable)
          .select("id, name, display_name")
          .eq("id", dataset.template_id)
          .single();
        
        if (templateError) {
          console.log("Template not found in primary table, trying alternative table:", templateError.message);
          
          // Try the alternate template table as fallback
          const fallbackTable = templateTable === "query_templates" ? "dependent_query_templates" : "query_templates";
          
          const { data: fallbackData, error: fallbackError } = await supabaseClient
            .from(fallbackTable)
            .select("id, name, display_name")
            .eq("id", dataset.template_id)
            .single();
            
          if (fallbackError) {
            console.log("Template not found in fallback table either:", fallbackError.message);
            // Continue without template data
          } else if (fallbackData) {
            template = fallbackData;
            console.log("Found template in fallback table:", template.id, template.name || template.display_name);
          }
        } else if (templateData) {
          template = templateData;
          console.log("Found template:", template.id, template.name || template.display_name);
        }
      } catch (templateFetchError) {
        console.error("Error during template fetching:", templateFetchError);
        // Continue without template data
      }
    }

    // Process the data with extra safety checks
    const data = execution.data || [];
    console.log("Data type before processing:", typeof data);
    
    // Handle different data formats with robust error handling
    let preview = [];
    try {
      if (Array.isArray(data)) {
        console.log("Data is an array with length:", data.length);
        preview = data.slice(0, limit);
      } else if (typeof data === 'object' && data !== null) {
        console.log("Data is an object");
        if (data.results && Array.isArray(data.results)) {
          console.log("Data has a results array property with length:", data.results.length);
          preview = data.results.slice(0, limit);
        } else {
          console.log("Data is a non-array object, wrapping in array");
          preview = [data];
        }
      } else if (typeof data === 'string') {
        // Try to parse string data as JSON (sometimes data can be stored as a JSON string)
        console.log("Data is a string, attempting to parse");
        try {
          const parsedData = JSON.parse(data);
          if (Array.isArray(parsedData)) {
            preview = parsedData.slice(0, limit);
          } else if (parsedData.results && Array.isArray(parsedData.results)) {
            preview = parsedData.results.slice(0, limit);
          } else {
            preview = [parsedData];
          }
        } catch (parseError) {
          console.error("Error parsing data string as JSON:", parseError);
          preview = [{value: data}]; // Fallback to using the string as a single field
        }
      } else {
        console.log("Data is of unexpected type, using empty array");
        preview = [];
      }
    } catch (dataProcessingError) {
      console.error("Error processing data:", dataProcessingError);
      return errorResponse(`Error processing execution data: ${dataProcessingError.message}`, 500);
    }
    
    // Get dataset columns with fallbacks for empty data
    let columns = [];
    if (preview.length > 0) {
      try {
        columns = Object.keys(preview[0]).map(key => ({ key, label: key }));
      } catch (columnsError) {
        console.error("Error extracting columns:", columnsError);
        columns = [{key: "data", label: "Data"}];
      }
    }

    // Determine total count based on data format
    let totalCount = 0;
    if (Array.isArray(execution.data)) {
      totalCount = execution.data.length;
    } else if (execution.data?.results && Array.isArray(execution.data.results)) {
      totalCount = execution.data.results.length;
    } else if (execution.row_count) {
      totalCount = execution.row_count;
    } else {
      totalCount = preview.length;
    }

    return successResponse({
      status: execution.status,
      execution: {
        id: execution.id,
        startTime: execution.start_time,
        endTime: execution.end_time,
        rowCount: execution.row_count || totalCount,
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
      totalCount
    });
  } catch (error) {
    console.error("Error in Dataset_Preview:", error);
    return errorResponse(error.message || "An unexpected error occurred", 500);
  }
});
