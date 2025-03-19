
import { useToast } from "@/hooks/use-toast";
import { Source } from "@/hooks/useSources";
import { testSourceConnection as apiTestSourceConnection, deleteSource as apiDeleteSource } from "@/api/sourceApi";

export async function testSourceConnection(sourceId: string, sourceData: Source, toast: ReturnType<typeof useToast>["toast"]) {
  try {
    toast({
      title: "Testing connection...",
      description: "Please wait while we test your source connection.",
    });
    
    const result = await apiTestSourceConnection(sourceId, sourceData);
    
    if (result.success) {
      toast({
        title: "Connection Successful",
        description: `Successfully connected to ${sourceData.name}`,
      });
      
      return result.updated; // Indicate whether sources should be refreshed
    } else {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the source.",
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
      await apiDeleteSource(sourceId);
      
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
