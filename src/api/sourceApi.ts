// src/api/sourceApi.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch the source schema from a connected data source
 * @param sourceId The ID of the source
 * @param forceUpdate Optional flag to force a schema update (default: false)
 */
export async function fetchSourceSchema(sourceId: string, forceUpdate: boolean = false) {
  try {
    const { data, error } = await supabase.functions.invoke('fetchSourceSchema', {
      body: { sourceId, forceUpdate }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching source schema:', error);
    throw error;
  }
}

/**
 * Validate a new source connection
 * @param sourceData Connection data for the source
 */
export async function validateSourceConnection(sourceData: any) {
  try {
    const { data, error } = await supabase.functions.invoke('validateSourceConnection', {
      body: sourceData
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error validating source connection:', error);
    throw error;
  }
}

/**
 * Test an existing source connection
 * @param sourceId The ID of the source to test
 */
export async function testSourceConnection(sourceId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('testSourceConnection', {
      body: { sourceId }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error testing source connection:', error);
    throw error;
  }
}

/**
 * Delete a source
 * @param sourceId The ID of the source to delete
 */
export async function deleteSource(sourceId: string) {
  try {
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', sourceId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting source:', error);
    throw error;
  }
}

/**
 * Fetch all user sources
 */
export async function fetchUserSources() {
  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching sources:", error);
    return [];
  }
}

/**
 * Fetch a single source by ID
 * @param sourceId The ID of the source to fetch
 */
export async function fetchSourceById(sourceId: string) {
  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching source:", error);
    throw error;
  }
}

/**
 * Create a new source
 * @param sourceData The source data to create
 */
export async function createSource(sourceData: any) {
  try {
    // Get the current user ID
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }

    // Add the user ID to the source data
    const sourceRecord = {
      ...sourceData,
      user_id: userData.user.id
    };

    const { data, error } = await supabase
      .from("sources")
      .insert(sourceRecord)
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating source:", error);
    throw error;
  }
}

/**
 * Update an existing source
 * @param sourceId The ID of the source to update
 * @param sourceData The new source data
 */
export async function updateSource(sourceId: string, sourceData: any) {
  try {
    const { data, error } = await supabase
      .from("sources")
      .update({
        ...sourceData,
        updated_at: new Date().toISOString()
      })
      .eq("id", sourceId)
      .select();
      
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error updating source:", error);
    throw error;
  }
}