
import { supabase } from "@/integrations/supabase/client";
import { fetchSourceSchema, testSourceConnection as apiTestSourceConnection } from "@/api/sources";
import { Source } from "@/hooks/useSources";

export interface TestConnectionResult {
  success: boolean;
  updated?: boolean;
  message?: string;
}

export async function testSourceConnection(id: string, toast: any): Promise<TestConnectionResult | null> {
  try {
    console.log("Testing source connection for ID:", id);
    
    // First, test the basic connection
    const result = await apiTestSourceConnection(id);
    
    if (!result.success) {
      toast({
        title: "Connection Error",
        description: result.message || "Failed to connect to the source",
        variant: "destructive",
      });
      return result;
    }
    
    // If the source is a Shopify source, also update its schema
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("source_type, config, last_validated_at")
      .eq("id", id)
      .single();
    
    if (sourceError) {
      console.error("Error fetching source details:", sourceError);
      throw new Error("Could not retrieve source details");
    }
    
    if (source && source.source_type === "shopify") {
      // Force refresh schema when testing connection
      try {
        console.log("Attempting to fetch source schema after successful connection test");
        await fetchSourceSchema(id, true);
        console.log("Schema updated successfully");
      } catch (schemaError) {
        console.error("Error fetching source schema:", schemaError);
        // Continue despite schema error - the connection test was successful
        toast({
          title: "Connection Successful, Schema Update Failed",
          description: "The connection test was successful, but we couldn't update the schema. This may be due to missing or invalid API credentials.",
          variant: "warning",
        });
        
        // Update the last_validated_at timestamp anyway to show the connection was tested
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
        }
        
        return {
          success: true, 
          updated: false,
          message: "Connection successful but schema update failed"
        };
      }
    }
    
    // Only show toast if one hasn't been shown already (in case of result.updated being true)
    if (!result.updated) {
      toast({
        title: "Connection Successful",
        description: "The source connection was tested successfully.",
        variant: "default",
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error testing source connection:", error);
    toast({
      title: "Connection Error",
      description: error instanceof Error ? error.message : "Failed to test connection",
      variant: "destructive",
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
