
import React from "react";

export default function ConnectionSuccessMessage() {
  return (
    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
      <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">
        Connection Successful!
      </h3>
      <p className="text-sm text-muted-foreground">
        Your source has been validated successfully.
      </p>
    </div>
  );
}
