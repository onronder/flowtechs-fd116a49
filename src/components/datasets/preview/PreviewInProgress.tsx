
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface PreviewInProgressProps {
  pollCount: number;
  maxPollCount: number;
  startTime: string;
}

export default function PreviewInProgress({ 
  pollCount, 
  maxPollCount, 
  startTime 
}: PreviewInProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const progressPercent = Math.min(Math.round((pollCount / maxPollCount) * 100), 99);
  
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (startTime) {
      const calculateElapsed = () => {
        const start = new Date(startTime).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedSeconds(elapsed);
      };
      
      // Calculate initially
      calculateElapsed();
      
      // Then update every second
      intervalId = setInterval(calculateElapsed, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [startTime]);
  
  // Format elapsed time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="flex items-center mb-4">
        <LoadingSpinner size="lg" />
        <div className="ml-4 flex flex-col">
          <div className="font-medium">Dataset execution in progress...</div>
          <div className="text-sm text-muted-foreground">
            Data is being fetched and processed
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-md mt-4">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <div>Poll {pollCount}/{maxPollCount}</div>
          {startTime && <div>Time elapsed: {formatTime(elapsedSeconds)}</div>}
        </div>
      </div>
    </div>
  );
}
