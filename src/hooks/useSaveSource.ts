
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SourceData, saveSource } from "@/utils/sourceSaveUtils";
import { fetchAndCacheShopifySchema } from "@/utils/shopifyApi";

export function useSaveSource() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSaveSource = async (sourceData: SourceData, existingId?: string) => {
    try {
      // Ensure user is authenticated
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to create a source",
          variant: "destructive"
        });
        navigate("/auth/signin");
        return { success: false };
      }

      setIsSaving(true);
      console.log("=== SAVING SOURCE START ===");
      
      const result = await saveSource(sourceData, existingId, toast);
      
      if (result?.success) {
        console.log("=== SAVING SOURCE COMPLETE ===");
        
        // After successful save, if it's a Shopify source, cache the schema
        if (sourceData.type === 'shopify' && result.id) {
          toast({
            title: "Caching Schema",
            description: "Fetching and caching Shopify GraphQL schema..."
          });
          
          try {
            const { storeName, accessToken, api_version } = sourceData.credentials;
            
            await fetchAndCacheShopifySchema(
              result.id,
              storeName,
              accessToken,
              api_version,
              true
            );
            
            console.log("Schema caching completed");
          } catch (schemaError) {
            console.error("Error caching schema:", schemaError);
            // Don't fail the source creation if schema caching fails
          }
        }
        
        toast({
          title: existingId ? "Source updated" : "Source created",
          description: "Your source has been saved successfully."
        });
        
        // Navigate to the sources page and ensure it reloads
        setTimeout(() => {
          navigate("/sources", { replace: true });
        }, 100);
        return { success: true };
      }
      
      return { success: false };
    } catch (error) {
      console.error("Error saving source:", error);
      toast({
        title: "Error",
        description: `Failed to ${existingId ? 'update' : 'create'} the source: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
      return { success: false, error };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleSaveSource
  };
}
