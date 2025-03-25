
import { supabase } from "@/integrations/supabase/client";
import { updateSourceApiVersionAndSchema } from "@/utils/shopify/sourceUpdater";
import { fetchSourceSchema } from "./sourceSchemas";

/**
 * Validates a source connection
 */
export async function validateSourceConnection(credentials: any) {
  try {
    console.log("Validating source connection with data:", {
      ...credentials,
      apiSecret: "REDACTED",
      accessToken: "REDACTED"
    });
    
    const { sourceType, ...config } = credentials;
    
    const requestBody = {
      sourceType,
      config
    };
    
    console.log("Prepared request body:", {
      ...requestBody,
      config: {
        ...requestBody.config,
        apiSecret: "REDACTED",
        accessToken: "REDACTED"
      }
    });
    
    const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
      body: requestBody
    });
    
    if (error) {
      console.error("Error validating connection:", error);
      throw new Error(error.message || "Validation failed");
    }
    
    return data;
  } catch (error) {
    console.error("Error in validateSourceConnection:", error);
    throw error;
  }
}

/**
 * Tests a source connection
 */
export async function testSourceConnection(sourceId: string) {
  try {
    console.log("Testing source connection for ID:", sourceId);
    
    // Get the source details
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
    
    if (sourceError) {
      console.error("Error fetching source:", sourceError);
      throw new Error(sourceError.message || "Failed to fetch source");
    }
    
    let requestBody = {
      sourceId,
      sourceType: source.source_type,
      config: source.config
    };
    
    // Test the connection
    const { data, error } = await supabase.functions.invoke("testSourceConnection", {
      body: requestBody
    });
    
    if (error) {
      console.error("Error testing connection:", error);
      throw new Error(error.message || "Connection test failed");
    }
    
    if (!data.success) {
      throw new Error(data.message || "Connection test failed");
    }
    
    // Always fetch and update schema after successful connection test
    if (data.success) {
      try {
        console.log("Attempting to fetch source schema after successful connection test");
        await fetchSourceSchema(sourceId, true);
        console.log("Schema updated successfully");
        
        // Check if the API version was updated
        if (data.updated) {
          return {
            success: true,
            updated: true,
            message: data.message
          };
        }
      } catch (schemaError) {
        console.error("Error updating schema:", schemaError);
        // Continue anyway since the connection test was successful
      }
    }
    
    return {
      success: true,
      updated: data.updated || false,
      message: data.message
    };
  } catch (error) {
    console.error("Error in testSourceConnection:", error);
    throw error;
  }
}

/**
 * Updates a source's API version to the latest version
 */
export async function updateSourceApiVersion(sourceId: string) {
  try {
    console.log(`Updating API version for source ${sourceId}`);
    return await updateSourceApiVersionAndSchema(sourceId);
  } catch (error) {
    console.error("Error updating source API version:", error);
    throw error;
  }
}
