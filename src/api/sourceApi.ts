
import { supabase } from "@/integrations/supabase/client";

export async function fetchUserSources() {
  // Get sources with counts of related datasets and jobs
  const { data, error } = await supabase
    .from("sources")
    .select(`
      *,
      datasets_count:user_datasets(count),
      jobs_count:dataset_job_queue(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Process the counts from the aggregation
  const sourcesWithCounts = data?.map(source => ({
    ...source,
    datasets_count: Array.isArray(source.datasets_count) && source.datasets_count[0] ? 
      Number(source.datasets_count[0].count) || 0 : 0,
    jobs_count: Array.isArray(source.jobs_count) && source.jobs_count[0] ? 
      Number(source.jobs_count[0].count) || 0 : 0
  })) || [];

  return sourcesWithCounts;
}

export async function fetchSourceById(id: string) {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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

export async function testSourceConnection(id: string) {
  try {
    console.log("Testing source connection for ID:", id);
    
    // First, fetch the source to get its type and configuration
    const source = await fetchSourceById(id);
    
    if (!source) {
      throw new Error("Source not found");
    }
    
    // Call the appropriate test function based on source type
    const { data, error } = await supabase.functions.invoke("testSourceConnection", {
      body: { sourceId: id, sourceType: source.source_type, config: source.config }
    });
    
    if (error) {
      console.error("Error testing source connection:", error);
      throw new Error(error.message || "Failed to test source connection");
    }
    
    return data;
  } catch (error) {
    console.error("Error in testSourceConnection:", error);
    throw error;
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

export async function fetchSourceSchema(sourceId: string, forceRefresh = false) {
  try {
    console.log(`Fetching schema for source ${sourceId}${forceRefresh ? ' (force refresh)' : ''}`);
    
    // Call the Edge Function to fetch the schema
    const { data, error } = await supabase.functions.invoke("fetchSourceSchema", {
      body: { 
        sourceId,
        forceRefresh
      }
    });
    
    if (error) {
      console.error("Error fetching source schema:", error);
      throw new Error(error.message || "Failed to fetch source schema");
    }
    
    return data;
  } catch (error) {
    console.error("Error in fetchSourceSchema:", error);
    throw error;
  }
}
