import { supabase } from "@/integrations/supabase/client";
import { Source } from "@/hooks/useSources";
import { TestConnectionResult } from "@/utils/sourceUtils";

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Fetches all sources for the current user with associated datasets count
 */
export async function fetchUserSources() {
  try {
    // Fetch all sources first
    const { data: sourcesData, error: sourcesError } = await supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (sourcesError) {
      throw new Error(sourcesError.message);
    }
    
    if (!sourcesData) {
      return [];
    }
    
    // Fetch dataset counts separately
    const datasetCounts = await Promise.all(
      sourcesData.map(async (source) => {
        const { count, error } = await supabase
          .from("user_datasets")
          .select("*", { count: "exact", head: true })
          .eq("source_id", source.id);
        
        return {
          sourceId: source.id,
          count: count || 0,
          error
        };
      })
    );
    
    // Map counts to sources
    const datasetCountMap = datasetCounts.reduce((acc, item) => {
      acc[item.sourceId] = item.count;
      return acc;
    }, {} as Record<string, number>);
    
    // Construct sources with counts
    const sourcesWithCounts = sourcesData.map(source => ({
      ...source,
      datasets_count: datasetCountMap[source.id] || 0,
      jobs_count: 0 // Default to 0 for jobs count until we set up that relationship
    }));
    
    return sourcesWithCounts;
  } catch (error) {
    console.error("Error in fetchUserSources:", error);
    throw error;
  }
}

/**
 * Fetches a single source by ID
 */
export async function fetchSourceById(id: string) {
  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch source: ${error.message}`);
    }

    if (!data) {
      throw new Error("Source not found");
    }

    return data;
  } catch (error) {
    console.error(`Error fetching source ${id}:`, error);
    throw error;
  }
}

export async function validateSourceConnection(connectionData: any) {
  try {
    console.log("Validating source connection with data:", {
      ...connectionData,
      accessToken: connectionData.accessToken ? "REDACTED" : undefined,
      apiSecret: connectionData.apiSecret ? "REDACTED" : undefined
    });
    
    // Prepare the request body with the correct structure
    const requestBody = {
      sourceType: connectionData.type || connectionData.sourceType,
      config: {
        ...connectionData
      }
    };
    
    // If the type/sourceType was included in the main object, remove it from config
    if (connectionData.type) {
      delete requestBody.config.type;
    }
    if (connectionData.sourceType) {
      delete requestBody.config.sourceType;
    }
    
    console.log("Prepared request body:", {
      ...requestBody,
      config: {
        ...requestBody.config,
        accessToken: "REDACTED",
        apiSecret: "REDACTED"
      }
    });
    
    // We are calling the Supabase Edge function to validate the connection
    const { data, error } = await supabase.functions.invoke("validateSourceConnection", {
      body: requestBody,
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error("Error in validateSourceConnection:", error);
    throw error;
  }
}

/**
 * Tests an existing source connection
 */
export async function testSourceConnection(id: string): Promise<TestConnectionResult> {
  try {
    console.log("Testing source connection for ID:", id);
    
    // First, fetch the source to get its type and configuration
    const source = await fetchSourceById(id);
    
    if (!source) {
      throw new Error("Source not found");
    }
    
    // Call the appropriate test function based on source type
    const { data, error } = await supabase.functions.invoke("testSourceConnection", {
      body: { 
        sourceId: id, 
        sourceType: source.source_type, 
        config: source.config 
      }
    });
    
    if (error) {
      console.error("Error testing source connection:", error);
      return {
        success: false,
        message: error.message || "Failed to test source connection"
      };
    }
    
    // Update the last validated timestamp
    try {
      await supabase
        .from("sources")
        .update({ 
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
    } catch (updateError) {
      console.error("Error updating source timestamps:", updateError);
      // Continue despite error - the connection test was successful
    }
    
    return {
      success: true,
      updated: data?.updated || false,
      message: data?.message
    };
  } catch (error) {
    console.error("Error in testSourceConnection:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unknown error occurred"
    };
  }
}

export async function deleteSource(id: string) {
  try {
    console.log("Deleting source with ID:", id);
    
    // Delete the source from the database
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting source:", error);
      throw new Error(error.message || "Failed to delete source");
    }
    
    console.log("Source deleted successfully");
    return true;
  } catch (error) {
    console.error("Error in deleteSource:", error);
    throw error;
  }
}

/**
 * Fetches the schema for a source with improved error handling
 */
export async function fetchSourceSchema(sourceId: string, forceRefresh = false) {
  try {
    console.log(`Fetching schema for source ${sourceId}${forceRefresh ? ' (force refresh)' : ''}`);
    
    if (!sourceId) {
      throw new Error("Source ID is required");
    }
    
    // Call the Edge Function to fetch the schema
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { 
        sourceId,
        forceUpdate: forceRefresh 
      }
    });
    
    if (error) {
      console.error("Error fetching source schema:", error);
      throw new Error(error.message || "Failed to fetch source schema");
    }
    
    if (!data) {
      throw new Error("No data returned from schema fetch");
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error("Error in fetchSourceSchema:", error);
    throw error;
  }
}
