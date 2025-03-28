
import { resolveDataset } from "./resolver.ts";
import { executeGraphQLQuery, executeDependentQuery } from "./graphqlClient.ts";
import { writeExecutionResult } from "./resultWriter.ts";
import { supabase } from "./_shared/supabaseClient.ts";
import { DatasetExecutionResult } from "./types.ts";

export async function runDatasetJob(datasetId: string): Promise<DatasetExecutionResult> {
  console.log(`Running dataset job for dataset ID: ${datasetId}`);
  
  // Create execution record to track progress
  const { data: execution, error: executionError } = await supabase
    .from("dataset_executions")
    .insert({
      dataset_id: datasetId,
      status: "pending",
      start_time: new Date().toISOString()
    })
    .select()
    .single();
    
  if (executionError) {
    console.error("Failed to create execution record:", executionError);
    throw new Error(`Failed to create execution record: ${executionError.message}`);
  }
  
  const executionId = execution.id;
  console.log(`Created execution record with ID: ${executionId}`);
  
  try {
    // Resolve dataset details
    const {
      dataset,
      type,
      shopifyToken,
      shop,
      queryTemplate,
      primaryQuery,
      secondaryQuery,
      userId
    } = await resolveDataset(datasetId);
    
    console.log(`Dataset type: ${type}, Shop: ${shop}`);
    
    // Update execution to include the user ID
    await supabase
      .from("dataset_executions")
      .update({ user_id: userId })
      .eq("id", executionId);
    
    // Execute the appropriate query based on dataset type
    const startTime = performance.now();
    let result;
    let rowCount = 0;
    
    if (type === "predefined") {
      console.log("Executing predefined query");
      result = await executeGraphQLQuery(shop, shopifyToken, queryTemplate);
      rowCount = estimateRowCount(result);
    } else if (type === "dependent") {
      console.log("Executing dependent query");
      result = await executeDependentQuery(shop, shopifyToken, primaryQuery, secondaryQuery);
      rowCount = Array.isArray(result) ? result.length : 1;
    } else if (type === "custom") {
      console.log("Executing custom query");
      result = await executeGraphQLQuery(shop, shopifyToken, dataset.custom_query);
      rowCount = estimateRowCount(result);
    } else {
      throw new Error(`Unsupported dataset type: ${type}`);
    }
    
    const executionTime = Math.round(performance.now() - startTime);
    console.log(`Execution completed in ${executionTime}ms with ${rowCount} rows`);
    
    // Write execution result to database
    await writeExecutionResult({
      datasetId,
      executionId,
      result,
      rowCount,
      executionTime,
      status: "completed"
    });
    
    return {
      executionId,
      status: "completed",
      rowCount,
      executionTime
    };
  } catch (error) {
    console.error(`Execution failed: ${error.message}`, error);
    
    // Update execution with error information
    await supabase
      .from("dataset_executions")
      .update({
        status: "failed",
        end_time: new Date().toISOString(),
        error_message: error.message
      })
      .eq("id", executionId);
    
    throw error;
  }
}

// Helper function to estimate row count from GraphQL results
function estimateRowCount(result: any): number {
  if (!result) return 0;
  
  // Try common GraphQL data structures
  for (const key in result) {
    const value = result[key];
    
    if (Array.isArray(value)) {
      return value.length;
    }
    
    if (value && typeof value === 'object') {
      // Check for pagination structures
      if (value.edges && Array.isArray(value.edges)) {
        return value.edges.length;
      }
      
      if (value.nodes && Array.isArray(value.nodes)) {
        return value.nodes.length;
      }
      
      // Check if there are items on a nested level
      for (const subKey in value) {
        const subValue = value[subKey];
        if (Array.isArray(subValue)) {
          return subValue.length;
        }
        
        if (subValue && typeof subValue === 'object') {
          if (subValue.edges && Array.isArray(subValue.edges)) {
            return subValue.edges.length;
          }
          
          if (subValue.nodes && Array.isArray(subValue.nodes)) {
            return subValue.nodes.length;
          }
        }
      }
    }
  }
  
  // Default to 1 if we couldn't determine the count
  return 1;
}
