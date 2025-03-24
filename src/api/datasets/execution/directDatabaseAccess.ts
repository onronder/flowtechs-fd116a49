
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches execution data directly from the database as a fallback
 * when the preview API fails
 */
export async function fetchDirectExecutionData(executionId: string) {
  if (!executionId) return null;
  
  try {
    console.log(`[Preview] Attempting direct data fetch for execution ID: ${executionId}`);
    
    // First get the execution details
    const { data: execution, error: executionError } = await supabase
      .from("dataset_executions")
      .select("*")
      .eq("id", executionId)
      .single();
    
    if (executionError || !execution) {
      console.error("[Preview] Direct fetch - execution error:", executionError);
      throw new Error(executionError?.message || "Execution not found");
    }
    
    // Get dataset details
    const { data: dataset, error: datasetError } = await supabase
      .from("user_datasets")
      .select("*")
      .eq("id", execution.dataset_id)
      .single();
    
    if (datasetError || !dataset) {
      console.error("[Preview] Direct fetch - dataset error:", datasetError);
      throw new Error(datasetError?.message || "Dataset not found");
    }
    
    // Get template details if available, handling possible errors gracefully
    let template = null;
    if (dataset.template_id) {
      try {
        // Try query_templates first
        const { data: queryTemplate, error: queryTemplateError } = await supabase
          .from("query_templates")
          .select("id, name, display_name")
          .eq("id", dataset.template_id)
          .single();
          
        if (queryTemplateError) {
          console.log("[Preview] Template not found in query_templates, trying dependent_query_templates");
          
          // Try dependent_query_templates as fallback
          const { data: depTemplate, error: depTemplateError } = await supabase
            .from("dependent_query_templates")
            .select("id, name, display_name")
            .eq("id", dataset.template_id)
            .single();
            
          if (!depTemplateError && depTemplate) {
            template = depTemplate;
          }
        } else {
          template = queryTemplate;
        }
      } catch (templateError) {
        console.log("[Preview] Error fetching template:", templateError);
        // Continue without template
      }
    }
    
    // Try using the SQL_Utils function to get data directly
    try {
      const { data: directData, error: directError } = await supabase.functions.invoke(
        "SQL_Utils",
        {
          body: {
            operation: "get_execution_data",
            parameters: { executionId }
          }
        }
      );
      
      if (directError) {
        console.error("[Preview] SQL_Utils error:", directError);
        throw new Error(directError.message || "Failed to get execution data");
      }
      
      if (directData && directData.data) {
        console.log("[Preview] Successfully retrieved data from SQL_Utils:", directData);
        
        // Process the raw data
        let rawData = directData.data;
        let preview = [];
        let totalCount = 0;
        
        // Data can sometimes be stored as JSON string, so handle that case
        if (typeof rawData === 'string') {
          try {
            rawData = JSON.parse(rawData);
          } catch (e) {
            console.log("[Preview] Data was string but not valid JSON");
          }
        }
        
        if (Array.isArray(rawData)) {
          preview = rawData.slice(0, 100);
          totalCount = rawData.length;
        } else if (rawData && typeof rawData === 'object') {
          if (rawData.results && Array.isArray(rawData.results)) {
            preview = rawData.results.slice(0, 100);
            totalCount = rawData.results.length;
          } else {
            preview = [rawData];
            totalCount = 1;
          }
        }
        
        // Get columns from first item
        const columns = preview.length > 0
          ? Object.keys(preview[0]).map(key => ({ key, label: key }))
          : [];
        
        return {
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
          totalCount,
          error: execution.status === "failed" ? execution.error_message : undefined
        };
      }
    } catch (sqlUtilsError) {
      console.error("[Preview] SQL_Utils fetch failed:", sqlUtilsError);
      // Fall through to default processing
    }
    
    // Process the data
    let preview = [];
    let totalCount = 0;
    
    // Data can sometimes be stored as JSON string, so handle that case
    let processedData = execution.data;
    if (typeof processedData === 'string') {
      try {
        processedData = JSON.parse(processedData);
      } catch (e) {
        console.log("[Preview] Data was string but not valid JSON");
      }
    }
    
    if (Array.isArray(processedData)) {
      preview = processedData.slice(0, 100);
      totalCount = processedData.length;
    } else if (processedData && typeof processedData === 'object') {
      preview = [processedData];
      totalCount = 1;
    } else {
      preview = [];
      totalCount = 0;
    }
    
    // Get columns from first item
    const columns = preview.length > 0
      ? Object.keys(preview[0]).map(key => ({ key, label: key }))
      : [];
    
    // Build response similar to the API
    return {
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
      totalCount,
      error: execution.status === "failed" ? execution.error_message : undefined
    };
  } catch (err) {
    console.error("[Preview] Error in direct data fetch:", err);
    throw err;
  }
}
