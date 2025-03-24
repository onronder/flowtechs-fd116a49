
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface PreviewFailedProps {
  errorMessage: string | undefined;
  onClose: () => void;
  onRetry?: () => void;
}

export default function PreviewFailed({ errorMessage, onClose, onRetry }: PreviewFailedProps) {
  const [showDetails, setShowDetails] = useState(false);
  const displayError = errorMessage || "An unknown error occurred during execution.";
  
  // Extract any JSON error message if present
  let parsedError = displayError;
  let errorDetails = null;
  
  try {
    if (displayError.includes('{') && displayError.includes('}')) {
      const jsonStart = displayError.indexOf('{');
      const jsonEnd = displayError.lastIndexOf('}') + 1;
      const jsonString = displayError.substring(jsonStart, jsonEnd);
      const errorObj = JSON.parse(jsonString);
      parsedError = errorObj.message || errorObj.error || displayError;
      errorDetails = jsonString;
    }
  } catch (e) {
    // If parsing fails, keep original error
    console.log("Could not parse error JSON:", e);
  }
  
  // Handle common error cases with more helpful messages
  if (parsedError.includes("Could not find a relationship between 'user_datasets' and 'template_id'")) {
    parsedError = "There was an issue connecting to the template for this dataset. The system is trying to fix this automatically - please try again.";
  } else if (parsedError.includes("Missing or invalid template query")) {
    parsedError = "The query template for this dataset appears to be missing or invalid. Please check your dataset configuration.";
  } else if (parsedError.includes("Missing or invalid source configuration")) {
    parsedError = "The connection configuration for your data source appears to be missing or invalid. Please check your source settings.";
  } else if (parsedError.includes("Missing required Shopify configuration values")) {
    parsedError = "Your Shopify connection is missing required configuration values. Please update your source connection settings.";
  } else if (parsedError.includes("Shopify API error")) {
    parsedError = "There was an error connecting to the Shopify API. Please verify your API credentials and permissions.";
  } else if (parsedError.includes("GraphQL error")) {
    parsedError = "There was an error in the GraphQL query sent to Shopify. Please check the query template for any syntax errors.";
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
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>Try Again</Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
