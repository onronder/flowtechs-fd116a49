
import { supabase } from "./_shared/supabaseClient.ts";
import { DatasetResolution } from "./types.ts";

export async function resolveDataset(datasetId: string): Promise<DatasetResolution> {
  console.log(`Resolving dataset with ID: ${datasetId}`);
  
  // Get dataset details
  const { data: dataset, error } = await supabase
    .from("user_datasets")
    .select("*, source:source_id(*)")
    .eq("id", datasetId)
    .single();
  
  if (error || !dataset) {
    console.error("Dataset not found:", error);
    throw new Error(`Dataset not found: ${error?.message || "Unknown error"}`);
  }
  
  const type = dataset.dataset_type;
  const userId = dataset.user_id;
  console.log(`Dataset type: ${type}, User ID: ${userId}`);
  
  // Get Shopify source details
  if (!dataset.source || !dataset.source.config) {
    throw new Error("Source configuration not found");
  }
  
  // Extract Shopify credentials from source config
  const shopifyConfig = dataset.source.config;
  const shopifyToken = shopifyConfig.accessToken;
  const shop = shopifyConfig.storeName;
  
  if (!shopifyToken || !shop) {
    throw new Error("Invalid Shopify configuration: missing access token or store name");
  }
  
  // Base resolution with common properties
  const baseResolution: Partial<DatasetResolution> = {
    dataset,
    userId,
    type,
    shopifyToken,
    shop
  };
  
  // Handle specific dataset types
  if (type === "predefined") {
    // Fetch the query template for predefined datasets
    const { data: template, error: templateError } = await supabase
      .from("query_templates")
      .select("query_template")
      .eq("id", dataset.template_id)
      .single();
    
    if (templateError || !template) {
      throw new Error(`Query template not found: ${templateError?.message || "Unknown error"}`);
    }
    
    return {
      ...baseResolution as any,
      queryTemplate: template.query_template
    };
  }
  
  if (type === "dependent") {
    // Fetch primary and secondary queries for dependent datasets
    const { data: template, error: templateError } = await supabase
      .from("dependent_query_templates")
      .select("primary_query, secondary_query, id_path")
      .eq("id", dataset.template_id)
      .single();
    
    if (templateError || !template) {
      throw new Error(`Dependent query template not found: ${templateError?.message || "Unknown error"}`);
    }
    
    return {
      ...baseResolution as any,
      primaryQuery: template.primary_query,
      secondaryQuery: template.secondary_query,
      idPath: template.id_path
    };
  }
  
  if (type === "custom") {
    // For custom datasets, the query is stored in the dataset record
    if (!dataset.custom_query) {
      throw new Error("Custom query not found in dataset");
    }
    
    return {
      ...baseResolution as any,
      queryTemplate: dataset.custom_query
    };
  }
  
  throw new Error(`Unsupported dataset type: ${type}`);
}
