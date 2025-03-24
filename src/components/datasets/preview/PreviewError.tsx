
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PreviewErrorProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

export default function PreviewError({ error, onRetry, onClose }: PreviewErrorProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-medium mb-2">Error Loading Preview</h3>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        {error}
      </p>
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
        <Button onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );
}
