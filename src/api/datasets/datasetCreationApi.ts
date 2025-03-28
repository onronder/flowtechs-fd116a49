
// src/api/datasets/datasetCreationApi.ts
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "./datasetsCommonApi";
import { 
  PredefinedDataset, 
  DependentDataset, 
  CustomDataset 
} from "./datasetsApiTypes";

/**
 * Create predefined dataset
 */
export async function createPredefinedDataset(datasetData: PredefinedDataset) {
  try {
    const userId = await getCurrentUserId();
    
    // Insert the user dataset with template_id as the name of the edge function
    // This works because we're now using the function name as the ID
    // instead of trying to reference a UUID from query_templates
    const { data, error } = await supabase
      .from("user_datasets")
      .insert({
        name: datasetData.name,
        description: datasetData.description || "",
        source_id: datasetData.sourceId,
        dataset_type: "predefined",
        template_id: datasetData.templateId, // Using edge function name as template_id
        user_id: userId
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating predefined dataset:", error);
    throw error;
  }
}

/**
 * Create dependent dataset
 */
export async function createDependentDataset(datasetData: DependentDataset) {
  try {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from("user_datasets")
      .insert({
        name: datasetData.name,
        description: datasetData.description || "",
        source_id: datasetData.sourceId,
        dataset_type: "dependent",
        template_id: datasetData.templateId,
        user_id: userId
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating dependent dataset:", error);
    throw error;
  }
}

/**
 * Create custom dataset
 */
export async function createCustomDataset(datasetData: CustomDataset) {
  try {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from("user_datasets")
      .insert({
        name: datasetData.name,
        description: datasetData.description || "",
        source_id: datasetData.sourceId,
        dataset_type: "custom",
        custom_query: datasetData.query,
        custom_fields: datasetData.selectedFields,
        parameters: {
          resourceType: datasetData.resourceType
        },
        user_id: userId
      })
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating custom dataset:", error);
    throw error;
  }
}

/**
 * Wrapper for createPredefinedDataset to match existing imports
 */
export async function createDatasetFromTemplate(datasetData: PredefinedDataset) {
  return createPredefinedDataset(datasetData);
}
