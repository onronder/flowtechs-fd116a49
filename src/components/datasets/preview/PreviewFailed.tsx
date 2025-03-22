
import { Button } from "@/components/ui/button";

interface PreviewFailedProps {
  errorMessage: string | undefined;
  onClose: () => void;
}

export default function PreviewFailed({ errorMessage, onClose }: PreviewFailedProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 p-4 rounded-md mb-4">
          <h3 className="text-lg font-medium mb-2">Execution Failed</h3>
          <p>{errorMessage || "An unknown error occurred during execution."}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
