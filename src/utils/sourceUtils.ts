
import { Source } from "@/hooks/useSources";
import { testSourceConnection as apiTestSourceConnection, deleteSource as apiDeleteSource } from "@/api/sourceApi";
import { toast } from "@/hooks/use-toast";

// Define the correct toast type based on how it's used in the hooks/use-toast.ts file
type ToastFunction = typeof toast;

/**
 * Tests a connection to a source
 * @param id The ID of the source to test
 * @param toast The toast function to display messages
 * @returns A promise with the test result
 */
export async function testSourceConnection(id: string, toast: ToastFunction) {
  console.log("Testing source connection:", { id });
  
  try {
    const result = await apiTestSourceConnection(id);
    
    if (result.success) {
      toast({
        title: "Connection successful",
        description: result.message || "Source connection is working correctly.",
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error testing source connection:", error);
    
    toast({
      title: "Connection failed",
      description: error instanceof Error ? error.message : "Failed to test connection",
      variant: "destructive",
    });
    
    throw error;
  }
}

/**
 * Deletes a source
 * @param id The ID of the source to delete
 * @param toast The toast function to display messages
 * @returns A promise that resolves to true if successful
 */
export async function deleteSource(id: string, toast: ToastFunction) {
  try {
    await apiDeleteSource(id);
    
    toast({
      title: "Source deleted",
      description: "Source has been successfully deleted.",
    });
    
    return true;
  } catch (error) {
    console.error("Error deleting source:", error);
    
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to delete source",
      variant: "destructive",
    });
    
    return false;
  }
}
