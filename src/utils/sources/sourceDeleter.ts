
import { deleteSource as apiDeleteSource } from "@/api/sources";

export async function deleteSource(id: string, toast: any) {
  try {
    await apiDeleteSource(id);
    toast({
      title: "Source Deleted",
      description: "The source was deleted successfully.",
      variant: "default",
    });
    return true;
  } catch (error) {
    console.error("Error deleting source:", error);
    toast({
      title: "Delete Error",
      description: error instanceof Error ? error.message : "Failed to delete source",
      variant: "destructive",
    });
    return false;
  }
}
