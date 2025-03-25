
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveSource, updateShopifySource } from "@/utils/sourceSaveUtils";
import { useToast } from "@/hooks/use-toast";
import { fetchSourceSchema } from "@/api/sourceApi";

export default function useSaveSource() {
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSaveSource = async (sourceData: any, existingId?: string) => {
    try {
      setIsSaving(true);
      
      let result;
      
      if (existingId) {
        // Update existing source
        result = await updateShopifySource(existingId, sourceData);
        toast({
          title: "Source updated",
          description: "Your data source has been updated successfully.",
        });
      } else {
        // Create new source
        result = await saveSource(sourceData);
        toast({
          title: "Source created",
          description: "Your data source has been created successfully.",
        });
      }
      
      // Ensure schema is fetched and cached with the latest API version
      if (result && result.success && result.source) {
        try {
          console.log(`Fetching schema for source ${result.source.id} (force refresh)`);
          await fetchSourceSchema(result.source.id, true);
          console.log("Schema updated successfully");
        } catch (schemaError) {
          console.error("Error fetching schema:", schemaError);
          toast({
            title: "Schema Warning",
            description: "Source created but schema caching encountered an issue. Some features may be limited.",
            variant: "destructive",
          });
        }
      }
      
      // Navigate back to sources list
      navigate("/sources");
    } catch (error) {
      console.error("Error saving source:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, handleSaveSource };
}
