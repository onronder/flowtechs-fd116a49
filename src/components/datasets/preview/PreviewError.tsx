
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface PreviewErrorProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

export default function PreviewError({ error, onRetry, onClose }: PreviewErrorProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 p-4 rounded-md mb-4">
          <h3 className="text-lg font-medium mb-2">Error Loading Dataset Preview</h3>
          <p className="text-sm">{error}</p>
        </div>
        <div className="flex justify-center space-x-2">
          <Button variant="outline" onClick={onRetry}>Try Again</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
