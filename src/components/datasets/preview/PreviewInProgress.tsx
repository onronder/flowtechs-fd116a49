
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

interface PreviewInProgressProps {
  pollCount: number;
  maxPollCount: number;
  startTime?: string;
}

export default function PreviewInProgress({ pollCount, maxPollCount, startTime }: PreviewInProgressProps) {
  // Calculate progress percentage
  const progressPercentage = (pollCount / maxPollCount) * 100;
  
  // Format elapsed time if startTime is provided
  let elapsedTimeDisplay = "";
  if (startTime) {
    try {
      const startTimeDate = new Date(startTime);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - startTimeDate.getTime()) / 1000);
      
      if (elapsedSeconds < 60) {
        elapsedTimeDisplay = `${elapsedSeconds} seconds`;
      } else {
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        elapsedTimeDisplay = `${minutes}m ${seconds}s`;
      }
    } catch (e) {
      console.error("Error calculating elapsed time:", e);
    }
  }
  
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center w-full max-w-md">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Execution in Progress</h3>
        <p className="text-muted-foreground mb-4">
          The dataset is being executed. This preview will update automatically when complete.
        </p>
        
        <div className="mb-2">
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <div>
            Polling attempt: {pollCount}/{maxPollCount}
          </div>
          {elapsedTimeDisplay && (
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {elapsedTimeDisplay}
            </div>
          )}
        </div>

        <div className="mt-6 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-md text-yellow-800 dark:text-yellow-200 text-sm">
          <p>If execution takes too long, you can close this preview and check results later.</p>
        </div>
      </div>
    </div>
  );
}
