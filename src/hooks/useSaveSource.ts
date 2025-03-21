
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { saveSource as saveSourceUtil, updateShopifySource } from "@/utils/sourceSaveUtils";
import { SourceDataForApi } from "@/types/source";

export default function useSaveSource() {
  const [isSaving, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSaveSource = async (sourceData: SourceDataForApi, existingId?: string) => {
    try {
      setIsLoading(true);
      
      let result;
      if (existingId) {
        result = await updateShopifySource(existingId, sourceData);
        
        toast({
          title: "Source updated",
          description: "Source has been successfully updated.",
        });
      } else {
        result = await saveSourceUtil(sourceData);
        
        toast({
          title: "Source created",
          description: "Source has been successfully created.",
        });
      }
      
      // Navigate to the sources homepage instead of the source details page
      navigate("/sources");
      
      return result;
    } catch (error) {
      console.error("Error saving source:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save source",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSaving,
    handleSaveSource
  };
}
