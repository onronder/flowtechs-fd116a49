import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface PreviewFailedProps {
  errorMessage: string | undefined;
  onClose: () => void;
}

export default function PreviewFailed({ errorMessage, onClose }: PreviewFailedProps) {
  const displayError = errorMessage || "An unknown error occurred during execution.";
  
  // Extract any JSON error message if present
  let parsedError = displayError;
  try {
    if (displayError.includes('{') && displayError.includes('}')) {
      const jsonStart = displayError.indexOf('{');
      const jsonEnd = displayError.lastIndexOf('}') + 1;
      const jsonString = displayError.substring(jsonStart, jsonEnd);
      const errorObj = JSON.parse(jsonString);
      parsedError = errorObj.message || errorObj.error || displayError;
    }
  } catch (e) {
    // If parsing fails, keep original error
    console.log("Could not parse error JSON:", e);
  }
  
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 p-4 rounded-md mb-4">
          <h3 className="text-lg font-medium mb-2">Execution Failed</h3>
          <p className="text-sm whitespace-pre-wrap">{parsedError}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
