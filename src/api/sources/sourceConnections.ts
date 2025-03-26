
import { supabase } from "@/integrations/supabase/client";
import { updateSourceApiVersionAndSchema } from "@/utils/shopify/sourceUpdater";
import { fetchSourceSchema } from "./sourceSchemas";
import { logger } from "@/utils/logging";

const COMPONENT = "sourceConnections";

/**
 * Validates a source connection
 */
export async function validateSourceConnection(credentials: any) {
  try {
    logger.info(
      COMPONENT,
      "Validating source connection",
      {
        ...credentials,
        apiSecret: "REDACTED",
        accessToken: "REDACTED"
      }
    );
    
    const { sourceType, ...config } = credentials;
    
    const requestBody = {
      sourceType,
      config
    };
    
    logger.debug(
      COMPONENT,
      "Prepared request body",
      {
        ...requestBody,
        config: {
          ...requestBody.config,
          apiSecret: "REDACTED",
          accessToken: "REDACTED"
        }
      }
    );
    
    const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
      body: requestBody
    });
    
    if (error) {
      logger.error(
        COMPONENT,
        "Error validating connection",
        { errorMessage: error.message },
        new Error(error.message)
      );
      throw new Error(error.message || "Validation failed");
    }
    
    return data;
  } catch (error) {
    logger.error(
      COMPONENT,
      "Error in validateSourceConnection",
      { errorMessage: error.message },
      error
    );
    throw error;
  }
}

/**
 * Tests a source connection
 */
export async function testSourceConnection(sourceId: string) {
  try {
    logger.info(
      COMPONENT,
      "Testing source connection",
      { sourceId }
    );
    
    // Get the source details
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
    
    if (sourceError) {
      logger.error(
        COMPONENT,
        "Error fetching source",
        { sourceId, errorMessage: sourceError.message },
        new Error(sourceError.message)
      );
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
      logger.error(
        COMPONENT,
        "Error testing connection",
        { sourceId, errorMessage: error.message },
        new Error(error.message)
      );
      throw new Error(error.message || "Connection test failed");
    }
    
    if (!data.success) {
      logger.error(
        COMPONENT,
        "Connection test failed",
        { sourceId, errorMessage: data.message },
        new Error(data.message)
      );
      throw new Error(data.message || "Connection test failed");
    }
    
    // Always fetch and update schema after successful connection test
    if (data.success) {
      try {
        logger.info(
          COMPONENT,
          "Fetching source schema after successful connection test",
          { sourceId }
        );
        await fetchSourceSchema(sourceId, true);
        logger.info(
          COMPONENT,
          "Schema updated successfully",
          { sourceId }
        );
        
        // Check if the API version was updated
        if (data.updated) {
          return {
            success: true,
            updated: true,
            message: data.message
          };
        }
      } catch (schemaError) {
        logger.error(
          COMPONENT,
          "Error updating schema",
          { sourceId, errorMessage: schemaError.message },
          schemaError
        );
        // Continue anyway since the connection test was successful
      }
    }
    
    return {
      success: true,
      updated: data.updated || false,
      message: data.message
    };
  } catch (error) {
    logger.error(
      COMPONENT,
      "Error in testSourceConnection",
      { errorMessage: error.message },
      error
    );
    throw error;
  }
}

/**
 * Updates a source's API version to the latest version
 */
export async function updateSourceApiVersion(sourceId: string) {
  try {
    logger.info(
      COMPONENT,
      "Updating API version for source",
      { sourceId }
    );
    return await updateSourceApiVersionAndSchema(sourceId);
  } catch (error) {
    logger.error(
      COMPONENT,
      "Error updating source API version",
      { sourceId, errorMessage: error.message },
      error
    );
    throw error;
  }
}
