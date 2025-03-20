
// src/api/datasets/shopifySchemaApi.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch Shopify GraphQL schema
 */
export async function fetchShopifySchema(sourceId: string) {
  try {
    const { data, error } = await supabase.functions.invoke("Cust_FetchSchema", {
      body: { sourceId }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching schema:", error);
    throw error;
  }
}

/**
 * Validate custom query
 */
export async function validateCustomQuery(sourceId: string, queryData: any) {
  try {
    const { data, error } = await supabase.functions.invoke("Cust_ValidateQuery", {
      body: { sourceId, ...queryData }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error validating query:", error);
    throw error;
  }
}
