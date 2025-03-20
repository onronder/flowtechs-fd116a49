
import { supabase } from "@/integrations/supabase/client";
import { Source } from "@/hooks/useSources";
import { redactSensitiveInfo } from "../utils/securityUtils";

/**
 * Validates a generic source connection using Supabase edge functions
 */
export async function validateGenericConnection(sourceType: string, credentials: any) {
  try {
    console.log("Validating generic source connection:", { 
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
    console.error("Error validating generic source connection:", error);
    throw error;
  }
}

/**
 * Tests an existing generic source connection
 */
export async function testGenericConnection(sourceId: string, source: Source) {
  try {
    console.log("Testing generic source connection:", { 
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
    
    return { success: data.success, updated: false };
  } catch (error) {
    console.error("Error testing generic source connection:", error);
    throw error;
  }
}
