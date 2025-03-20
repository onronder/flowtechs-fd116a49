
import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function ConnectionSuccessMessage({ message }: { message?: string }) {
  return (
    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg flex items-start">
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
      <div>
        <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">
          Connection Successful!
        </h3>
        <p className="text-sm text-muted-foreground">
          {message || "Your source has been validated successfully."}
        </p>
      </div>
    </div>
  );
}
