
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";

interface PreviewLoadingProps {
  message?: string;
  subMessage?: string;
  progress?: number;
}

export default function PreviewLoading({ 
  message = "Loading dataset results...",
  subMessage = "This may take a moment depending on the dataset size",
  progress
}: PreviewLoadingProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="flex items-center mb-4">
        <LoadingSpinner size="lg" />
        <div className="ml-4 flex flex-col">
          <div className="font-medium">{message}</div>
          <div className="text-sm text-muted-foreground">{subMessage}</div>
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="w-full max-w-md mt-4">
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center mt-2">
            {Math.round(progress)}% complete
          </div>
        </div>
      )}
    </div>
  );
}
