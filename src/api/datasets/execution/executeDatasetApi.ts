
import { supabase } from "@/integrations/supabase/client";

/**
 * Execute dataset
 */
export async function executeDataset(datasetId: string) {
  try {
    // Add extensive logging
    console.log(`Executing dataset with ID: ${datasetId}`);
    
    if (!datasetId || typeof datasetId !== 'string') {
      console.error("Invalid datasetId provided:", datasetId);
      throw new Error("A valid dataset ID is required");
    }
    
    // Create the payload as a plain object
    const payload = { datasetId };
    
    // Log the payload we're sending
    console.log("Request payload:", payload);
    
    // Pass the payload directly as an object (newer Supabase client versions handle this correctly)
    console.log("Invoking Dataset_Execute function with object payload...");
    const { data, error } = await supabase.functions.invoke(
      "Dataset_Execute",
      { 
        body: payload, // Passing as plain object (no stringify)
        headers: { 
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (error) {
      console.error("Error from Dataset_Execute function:", error);
      throw error;
    }
    
    console.log("Dataset execution response:", data);
    return data;
  } catch (error) {
    console.error("Error executing dataset:", error);
    throw error;
  }
}

/**
 * Execute custom dataset (direct query execution)
 */
export async function executeCustomDataset(sourceId: string, query: string) {
  try {
    console.log(`Executing custom dataset query for source ID: ${sourceId}`);
    const payload = JSON.stringify({ sourceId, query });
    
    const { data, error } = await supabase.functions.invoke(
      "Cust_ExecuteDataset",
      { 
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (error) {
      console.error("Error from Cust_ExecuteDataset function:", error);
      throw error;
    }
    
    console.log("Custom dataset execution response:", data);
    return data;
  } catch (error) {
    console.error("Error executing custom dataset:", error);
    throw error;
  }
}
