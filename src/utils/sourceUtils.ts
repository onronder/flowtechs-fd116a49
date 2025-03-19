
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export async function testSourceConnection(sourceId: string, sourceData: any, toast: ReturnType<typeof useToast>["toast"]) {
  try {
    toast({
      title: "Testing connection...",
      description: "Please wait while we test your source connection.",
    });
    
    // Test connection based on source type
    const response = await fetch(`${window.location.origin}/api/validateSourceConnection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: sourceData.source_type,
        config: sourceData.config,
      }),
    });
    
    // Log response for debugging
    console.log("Test connection response status:", response.status);
    const responseText = await response.text();
    console.log("Raw response:", responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      throw new Error("Invalid response format from server");
    }
    
    if (result.success) {
      toast({
        title: "Connection Successful",
        description: `Successfully connected to ${sourceData.name}`,
      });
      
      // Update source if API version changed
      if (sourceData.source_type === "shopify" && 
          result.config.api_version !== sourceData.config.api_version) {
        
        await supabase
          .from("sources")
          .update({ 
            config: result.config,
            last_validated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", sourceId);
        
        return true; // Indicate that sources should be refreshed
      }
      
      return false; // No refresh needed
    } else {
      toast({
        title: "Connection Failed",
        description: result.error || "Failed to connect to the source.",
        variant: "destructive",
      });
      return false;
    }
  } catch (error) {
    console.error("Error testing source:", error);
    toast({
      title: "Error",
      description: error instanceof Error 
        ? error.message 
        : "An error occurred while testing the connection.",
      variant: "destructive",
    });
    return false;
  }
}

export async function deleteSource(sourceId: string, toast: ReturnType<typeof useToast>["toast"]) {
  if (confirm("Are you sure you want to delete this source? This action cannot be undone.")) {
    try {
      const { error } = await supabase
        .from("sources")
        .delete()
        .eq("id", sourceId);
      
      if (error) throw error;
      
      toast({
        title: "Source Deleted",
        description: "The source has been deleted successfully.",
      });
      
      return true; // Indicate success
    } catch (error) {
      console.error("Error deleting source:", error);
      toast({
        title: "Error",
        description: "Failed to delete the source. Please try again.",
        variant: "destructive",
      });
      return false; // Indicate failure
    }
  }
  return false;
}
