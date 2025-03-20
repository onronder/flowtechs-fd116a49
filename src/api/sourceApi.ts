
import { supabase } from "@/integrations/supabase/client";
import { Source } from "@/hooks/useSources";
import { redactSensitiveInfo } from "./utils/securityUtils";
import { validateShopifyConnection, testShopifyConnection } from "./sourceTypes/shopifyApi";
import { validateGenericConnection, testGenericConnection } from "./sourceTypes/genericSourceApi";

// Re-export schema API functions
export { fetchSourceSchema } from "./schemaApi";

/**
 * Validates the connection to a data source
 */
export async function validateSourceConnection(sourceType: string, credentials: any) {
  try {
    console.log("Validating credentials:", { 
      sourceType, 
      credentials: redactSensitiveInfo(credentials)
    });
    
    // Dispatch to the appropriate validator based on source type
    if (sourceType === 'shopify') {
      return await validateShopifyConnection(credentials);
    } else {
      return await validateGenericConnection(sourceType, credentials);
    }
  } catch (error) {
    console.error("Error validating source connection:", error);
    throw error;
  }
}

/**
 * Tests the connection to an existing source
 */
export async function testSourceConnection(sourceId: string, source: Source) {
  try {
    console.log("Testing source connection:", { 
      sourceId, 
      sourceType: source.source_type,
      config: redactSensitiveInfo(source.config)
    });
    
    // Dispatch to the appropriate tester based on source type
    if (source.source_type === 'shopify') {
      return await testShopifyConnection(sourceId, source);
    } else {
      return await testGenericConnection(sourceId, source);
    }
  } catch (error) {
    console.error("Error testing source connection:", error);
    throw error;
  }
}

/**
 * Deletes a source
 */
export async function deleteSource(sourceId: string) {
  try {
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", sourceId);
    
    if (error) {
      console.error("Error deleting source:", error);
      throw new Error(error.message || "Failed to delete source");
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting source:", error);
    throw error;
  }
}
