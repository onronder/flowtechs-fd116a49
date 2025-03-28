
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
    
    // Validate that the template exists (this would ideally check if the edge function exists)
    if (!datasetData.templateId) {
      throw new Error("Template ID is required");
    }
    
    console.log("Creating predefined dataset with template:", datasetData.templateId);
    
    // Insert the user dataset with template_id as the name of the edge function
    const { data, error } = await supabase
      .from("user_datasets")
      .insert({
        name: datasetData.name,
        description: datasetData.description || "",
        source_id: datasetData.sourceId,
        dataset_type: "predefined",
        template_id: datasetData.templateId, // Now storing the edge function name directly
        user_id: userId
      })
      .select();
      
    if (error) {
      console.error("Error inserting dataset:", error);
      throw error;
    }
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
