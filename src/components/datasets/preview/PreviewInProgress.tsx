
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";

interface PreviewInProgressProps {
  pollCount: number;
  maxPollCount: number;
}

export default function PreviewInProgress({ pollCount, maxPollCount }: PreviewInProgressProps) {
  // Calculate progress percentage
  const progressPercentage = (pollCount / maxPollCount) * 100;
  
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
        <div className="text-sm text-muted-foreground">
          Polling attempt: {pollCount}/{maxPollCount}
        </div>
      </div>
    </div>
  );
}
