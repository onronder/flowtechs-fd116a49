
import LoadingSpinner from "@/components/ui/loading-spinner";

interface PreviewInProgressProps {
  pollCount: number;
  maxPollCount: number;
}

export default function PreviewInProgress({ pollCount, maxPollCount }: PreviewInProgressProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Execution in Progress</h3>
        <p className="text-muted-foreground mb-2">
          The dataset is still being executed. This preview will update automatically.
        </p>
        <div className="text-sm text-muted-foreground">
          Polling attempt: {pollCount}/{maxPollCount}
        </div>
      </div>
    </div>
  );
}
