
import { scheduleWeeklyUpdates } from "@/utils/shopify/versionDetector";

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
