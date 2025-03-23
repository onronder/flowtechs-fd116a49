import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface PreviewErrorProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

export default function PreviewError({ error, onRetry, onClose }: PreviewErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  let displayError = error;
  let errorDetails = null;
  
  try {
    if (error.includes('{') && error.includes('}')) {
      const jsonStart = error.indexOf('{');
      const jsonEnd = error.lastIndexOf('}') + 1;
      const jsonString = error.substring(jsonStart, jsonEnd);
      const errorObj = JSON.parse(jsonString);
      
      displayError = errorObj.message || errorObj.error || "An error occurred";
      errorDetails = jsonString;
    }
  } catch (e) {
    console.log("Could not parse error as JSON:", e);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 p-4 rounded-md mb-4">
          <h3 className="text-lg font-medium mb-2">Error Loading Dataset Preview</h3>
          <p className="text-sm break-words">{displayError}</p>
          
          {errorDetails && (
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs"
              >
                {showDetails ? "Hide Details" : "Show Technical Details"}
              </Button>
              
              {showDetails && (
                <pre className="mt-2 p-2 bg-red-50 dark:bg-red-900 rounded text-xs text-left overflow-auto max-h-32">
                  {errorDetails}
                </pre>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-center space-x-2">
          <Button variant="outline" onClick={onRetry}>Try Again</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
