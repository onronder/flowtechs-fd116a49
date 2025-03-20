
import { supabase } from "@/integrations/supabase/client";
import { fetchSourceSchema } from "@/api/sourceApi";
import { ToastActionElement } from "@/components/ui/toast";

// Define source type to match database enum
export type SourceType = "shopify" | "woocommerce" | "ftp_sftp" | "custom_api";

export interface SourceData {
  type: string;
  name: string;
  description: string;
  credentials: any;
  validationResult: any;
}

// Use the correct toast type from our component library
type ToastProps = {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
};

/**
 * Saves a source to Supabase database using database functions
 */
export async function saveSource(
  sourceData: SourceData, 
  existingId?: string,
  toast?: (props: ToastProps) => void
) {
  try {
    // Log for debugging
    console.log("Saving source data:", {
      ...sourceData,
      credentials: { 
        ...sourceData.credentials, 
        accessToken: sourceData.credentials?.accessToken ? "REDACTED" : undefined,
        apiKey: sourceData.credentials?.apiKey ? "REDACTED" : undefined,
        password: sourceData.credentials?.password ? "REDACTED" : undefined,
        consumerSecret: sourceData.credentials?.consumerSecret ? "REDACTED" : undefined
      }
    });

    let result;
    
    if (existingId) {
      // Update existing source using database function
      const { data, error } = await supabase.rpc('update_source', {
        p_id: existingId,
        p_name: sourceData.name,
        p_description: sourceData.description || null,
        p_config: sourceData.credentials
      });
      
      if (error) {
        console.error("Error updating source:", error);
        throw error;
      }
      
      // Properly handle the data response - it's a JSON object, not a string
      const responseData = data as Record<string, any>;
      result = { sourceId: existingId, success: true };
      console.log("Source updated successfully:", responseData);
    } else {
      // Create new source using database function
      const { data, error } = await supabase.rpc('insert_source', {
        p_name: sourceData.name,
        p_description: sourceData.description || null,
        p_source_type: sourceData.type,
        p_config: sourceData.credentials
      });
      
      if (error) {
        console.error("Error inserting source:", error);
        throw error;
      }
      
      // Properly handle the data response - it's a JSON object, not a string
      const responseData = data as Record<string, any>;
      const sourceId = responseData.id as string;
      console.log("Source created successfully, ID:", sourceId, "Data:", responseData);
      result = { sourceId, success: true };
    }

    // If this is a Shopify source, fetch and cache the schema
    if (sourceData.type === "shopify" && result.sourceId) {
      console.log("Fetching schema for Shopify source:", result.sourceId);
      try {
        const schemaResult = await fetchSourceSchema(result.sourceId, true);
        console.log("Schema fetch result:", schemaResult);
      } catch (schemaError) {
        console.error("Error fetching schema:", schemaError);
        // Continue anyway - don't block source creation if schema fetch fails
      }
    }

    return result;
  } catch (error) {
    console.error("Error saving source:", error);
    throw error;
  }
}
