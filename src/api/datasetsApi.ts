
import { supabase } from "@/integrations/supabase/client";

// Mock data for development
const mockDatasets = [
  {
    id: "1",
    name: "Shopify Products",
    description: "All products from our Shopify store",
    dataset_type: "predefined",
    source: {
      id: "s1",
      name: "My Shopify Store",
      source_type: "shopify"
    },
    last_execution_time: new Date().toISOString(),
    last_row_count: 42,
    last_execution_id: "ex1"
  },
  {
    id: "2",
    name: "Product Inventory",
    description: "Inventory levels across all products",
    dataset_type: "dependent",
    source: {
      id: "s1",
      name: "My Shopify Store",
      source_type: "shopify"
    },
    last_execution_time: new Date(Date.now() - 86400000).toISOString(),
    last_row_count: 156,
    last_execution_id: "ex2"
  }
];

// Fetch user datasets
export async function fetchUserDatasets() {
  // For development/demo, return mock data
  return mockDatasets;
  
  // Uncomment for production implementation:
  /*
  const { data, error } = await supabase
    .from("user_datasets")
    .select(`
      *,
      source:source_id(*),
      last_execution:dataset_executions(
        id,
        status,
        start_time,
        end_time,
        row_count,
        execution_time_ms
      )
    `)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  // Process the data to add some computed properties
  return data.map(dataset => ({
    ...dataset,
    last_execution_id: dataset.last_execution?.[0]?.id,
    last_execution_time: dataset.last_execution?.[0]?.end_time,
    last_row_count: dataset.last_execution?.[0]?.row_count
  }));
  */
}

// Execute dataset
export async function executeDataset(datasetId: string) {
  // Demo implementation
  console.log(`Executing dataset ${datasetId}`);
  
  // Simulate success
  return { success: true, executionId: "demo-exec-id" };
  
  // Uncomment for production implementation:
  /*
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Execute", 
    { body: { datasetId } }
  );
  
  if (error) throw error;
  
  return data;
  */
}

// Delete dataset
export async function deleteDataset(datasetId: string) {
  // Demo implementation
  console.log(`Deleting dataset ${datasetId}`);
  
  // Simulate success
  return true;
  
  // Uncomment for production implementation:
  /*
  const { error } = await supabase
    .from("user_datasets")
    .delete()
    .eq("id", datasetId);
  
  if (error) throw error;
  
  return true;
  */
}
