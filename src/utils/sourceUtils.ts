
import { supabase } from "@/integrations/supabase/client";
import { fetchSourceSchema } from "@/api/sourceApi";
import { scheduleWeeklyUpdates } from "@/utils/shopify/versionDetector";
import { 
  testSourceConnection as apiTestSourceConnection, 
  deleteSource as apiDeleteSource 
} from "@/api/sourceApi";

export async function testSourceConnection(id: string, toast: any) {
  try {
    console.log("Testing source connection for ID:", id);
    
    // First, test the basic connection
    const result = await apiTestSourceConnection(id);
    
    // If the source is a Shopify source, also update its schema
    const { data: source } = await supabase
      .from("sources")
      .select("source_type, config")
      .eq("id", id)
      .single();
    
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
          description: "The connection test was successful, but we couldn't update the schema. This won't affect your ability to use the source.",
          variant: "warning",
        });
        return result;
      }
    }
    
    toast({
      title: "Connection Successful",
      description: "The source connection was tested successfully.",
      variant: "default",
    });
    
    return result;
  } catch (error) {
    console.error("Error testing source connection:", error);
    toast({
      title: "Connection Error",
      description: error.message || "Failed to test connection",
      variant: "destructive",
    });
    return null;
  }
}

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
      description: error.message || "Failed to delete source",
      variant: "destructive",
    });
    return false;
  }
}

// Setup weekly update schedule on app initialization
export function initializeSourceUpdates() {
  console.log("Initializing weekly source updates");
  
  // Immediately run an update
  scheduleWeeklyUpdates()
    .then(success => {
      console.log(`Initial source update ${success ? 'completed' : 'failed'}`);
    })
    .catch(err => {
      console.error("Error in initial source update:", err);
    });
  
  // Set up weekly update schedule (run every Sunday at 2 AM)
  const checkAndScheduleUpdate = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const hour = now.getHours();
    
    if (day === 0 && hour === 2) {
      scheduleWeeklyUpdates()
        .then(success => {
          console.log(`Weekly source update ${success ? 'completed' : 'failed'}`);
        })
        .catch(err => {
          console.error("Error in weekly source update:", err);
        });
    }
  };
  
  // Check once per hour if it's time for the weekly update
  setInterval(checkAndScheduleUpdate, 60 * 60 * 1000);
  
  return true;
}
