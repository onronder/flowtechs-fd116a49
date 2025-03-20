
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { saveSource, updateShopifySource, SourceData } from "@/utils/sourceSaveUtils";

export default function useSaveSource() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSaveSource = async (sourceData: SourceData) => {
    try {
      setIsLoading(true);
      
      const result = await saveSource(sourceData);
      
      toast({
        title: "Source created",
        description: "Source has been successfully created.",
      });
      
      // Navigate to the source details page
      if (result.source && result.source.id) {
        navigate(`/sources/${result.source.id}`);
      } else {
        navigate("/sources");
      }
      
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

  const handleUpdateSource = async (sourceId: string, sourceData: SourceData) => {
    try {
      setIsLoading(true);
      
      const result = await updateShopifySource(sourceId, sourceData);
      
      toast({
        title: "Source updated",
        description: "Source has been successfully updated.",
      });
      
      // Navigate to the source details page
      navigate(`/sources/${sourceId}`);
      
      return result;
    } catch (error) {
      console.error("Error updating source:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update source",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    saveSource: handleSaveSource,
    updateSource: handleUpdateSource,
  };
}
