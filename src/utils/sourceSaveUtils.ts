
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
 * Saves a source to Supabase database
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

    const userData = await supabase.auth.getUser();
    
    if (!userData.data.user) {
      if (toast) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to create a source.",
          variant: "destructive",
        });
      }
      throw new Error("User not authenticated");
    }

    // Create source record with proper typing
    const sourceRecord = {
      name: sourceData.name,
      description: sourceData.description || null,
      source_type: sourceData.type as SourceType,
      config: sourceData.credentials,
      user_id: userData.data.user.id,
      is_active: true,
      last_validated_at: new Date().toISOString()
    };

    console.log("Inserting source record:", {
      ...sourceRecord,
      config: { 
        ...sourceRecord.config, 
        accessToken: sourceRecord.config?.accessToken ? "REDACTED" : undefined,
        apiKey: sourceRecord.config?.apiKey ? "REDACTED" : undefined,
        password: sourceRecord.config?.password ? "REDACTED" : undefined,
        consumerSecret: sourceRecord.config?.consumerSecret ? "REDACTED" : undefined 
      }
    });

    let sourceId;
    
    if (existingId) {
      // Update existing source
      const { data: updateData, error: updateError } = await supabase
        .from("sources")
        .update({
          name: sourceRecord.name,
          description: sourceRecord.description,
          config: sourceRecord.config,
          updated_at: new Date().toISOString(),
          last_validated_at: sourceRecord.last_validated_at,
        })
        .eq("id", existingId)
        .select();
      
      if (updateError) {
        console.error("Error updating source:", updateError);
        throw updateError;
      }
      
      sourceId = existingId;
      console.log("Source updated successfully:", updateData);
    } else {
      // Create new source
      const { data: insertData, error: insertError } = await supabase
        .from("sources")
        .insert(sourceRecord)
        .select();
      
      if (insertError) {
        console.error("Error inserting source:", insertError);
        throw insertError;
      }
      
      sourceId = insertData?.[0]?.id;
      console.log("Source created successfully, ID:", sourceId, "Data:", insertData);
    }

    // If this is a Shopify source, fetch and cache the schema
    if (sourceData.type === "shopify" && sourceId) {
      console.log("Fetching schema for Shopify source:", sourceId);
      try {
        const schemaResult = await fetchSourceSchema(sourceId, true);
        console.log("Schema fetch result:", schemaResult);
      } catch (schemaError) {
        console.error("Error fetching schema:", schemaError);
        // Continue anyway - don't block source creation if schema fetch fails
      }
    }

    return { sourceId, success: true };
  } catch (error) {
    console.error("Error saving source:", error);
    throw error;
  }
}
