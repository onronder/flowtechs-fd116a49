
import { Source } from "@/hooks/useSources";
import { testSourceConnection as apiTestSourceConnection, deleteSource as apiDeleteSource } from "@/api/sourceApi";

/**
 * Tests a connection to a source
 * @param id The ID of the source to test
 * @param source The source object
 * @param toast The toast function to display messages
 * @returns A promise with the test result
 */
export async function testSourceConnection(id: string, source: Source, toast: any) {
  try {
    const result = await apiTestSourceConnection(id, source);
    return result;
  } catch (error) {
    console.error("Error testing source connection:", error);
    if (toast) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive",
      });
    }
    throw error;
  }
}

/**
 * Deletes a source
 * @param id The ID of the source to delete
 * @param toast The toast function to display messages
 * @returns A promise that resolves to true if successful
 */
export async function deleteSource(id: string, toast: any) {
  try {
    await apiDeleteSource(id);
    
    if (toast) {
      toast({
        title: "Source deleted",
        description: "Source has been successfully deleted.",
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting source:", error);
    
    if (toast) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete source",
        variant: "destructive",
      });
    }
    
    return false;
  }
}
