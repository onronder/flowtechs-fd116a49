
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
 * Saves a source to Supabase database using direct table operations
 * instead of database functions, which helps avoid user_id issues
 */
export async function saveSource(
  sourceData: SourceData, 
  existingId?: string,
  toast?: (props: ToastProps) => void
) {
  try {
    console.log("=== SAVING SOURCE START ===");
    // Log for debugging (redact sensitive info)
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
    
    // First, get the current authenticated user
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (!userId) {
      throw new Error("You must be logged in to save a source.");
    }
    
    if (existingId) {
      // Update existing source using direct table operations
      const { data, error } = await supabase
        .from('sources')
        .update({
          name: sourceData.name,
          description: sourceData.description || null,
          config: sourceData.credentials,
          updated_at: new Date().toISOString(),
          last_validated_at: new Date().toISOString()
        })
        .eq('id', existingId)
        .select();
      
      if (error) {
        console.error("Error updating source:", error);
        throw error;
      }
      
      result = { sourceId: existingId, success: true };
      console.log("Source updated successfully:", data);
    } else {
      // Create new source using direct table operations
      const { data, error } = await supabase
        .from('sources')
        .insert({
          name: sourceData.name,
          description: sourceData.description || null,
          source_type: sourceData.type as SourceType,
          config: sourceData.credentials,
          user_id: userId,
          is_active: true,
          last_validated_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.error("Error inserting source:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("Failed to get source ID after saving");
      }
      
      const sourceId = data[0].id;
      console.log("Source created successfully, ID:", sourceId);
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
    
    console.log("=== SAVING SOURCE COMPLETE ===");
    return result;
  } catch (error) {
    console.error("Error saving source:", error);
    throw error;
  }
}
