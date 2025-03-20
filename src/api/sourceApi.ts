
import { supabase } from "@/integrations/supabase/client";
import { Source } from "@/hooks/useSources";

/**
 * Redacts sensitive information from credentials for logging
 */
function redactSensitiveInfo(credentials: any) {
  if (!credentials) return {};
  
  const redacted = { ...credentials };
  const sensitiveFields = ['accessToken', 'apiKey', 'password', 'consumerSecret', 'secretKey', 'token'];
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = "REDACTED";
    }
  }
  
  return redacted;
}

/**
 * Validates the connection to a data source
 */
export async function validateSourceConnection(sourceType: string, credentials: any) {
  try {
    console.log("Validating source connection:", { 
      sourceType, 
      credentials: redactSensitiveInfo(credentials)
    });
    
    const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
      body: { sourceType, config: credentials },
    });
    
    if (error) {
      console.error("Error from Supabase function:", error);
      throw new Error(error.message || "Failed to validate source connection");
    }
    
    return data;
  } catch (error) {
    console.error("Error validating source connection:", error);
    throw error;
  }
}

/**
 * Fetches the schema for a data source
 */
export async function fetchSourceSchema(sourceId: string, forceUpdate = false) {
  try {
    console.log(`Fetching schema for source ${sourceId}, forceUpdate: ${forceUpdate}`);
    
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { sourceId, forceUpdate },
    });
    
    if (error) {
      console.error("Error from Supabase function:", error);
      throw new Error(error.message || "Failed to fetch source schema");
    }
    
    console.log("Schema fetch response:", data);
    return data;
  } catch (error) {
    console.error("Error fetching source schema:", error);
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
    
    const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
      body: { 
        sourceType: source.source_type, 
        config: source.config 
      },
    });
    
    if (error) {
      console.error("Error from Supabase function:", error);
      throw new Error(error.message || "Failed to test source connection");
    }
    
    // If successful and source type is Shopify, check if API version changed
    if (data.success && source.source_type === "shopify" && 
        data.config.api_version !== source.config.api_version) {
      
      const { error: updateError } = await supabase
        .from("sources")
        .update({ 
          config: data.config,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", sourceId);
      
      if (updateError) {
        console.error("Error updating source:", updateError);
        throw new Error(updateError.message || "Failed to update source with new API version");
      }
      
      return { success: true, updated: true };
    }
    
    return { success: data.success, updated: false };
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
