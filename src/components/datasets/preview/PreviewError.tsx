
import { Button } from "@/components/ui/button";

interface PreviewErrorProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

export default function PreviewError({ error, onRetry, onClose }: PreviewErrorProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 p-4 rounded-md mb-4">
          <h3 className="text-lg font-medium mb-2">Error Loading Preview</h3>
          <p>{error}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>Try Again</Button>
        <Button variant="outline" className="ml-2" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
