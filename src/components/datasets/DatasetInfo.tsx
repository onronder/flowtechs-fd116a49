
import React from "react";

interface DatasetInfoProps {
  sourceName?: string;
  lastExecutionTime?: string;
  rowCount?: number;
}

export default function DatasetInfo({ 
  sourceName, 
  lastExecutionTime, 
  rowCount 
}: DatasetInfoProps) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <div className="flex justify-between">
        <span>Source:</span>
        <span className="font-medium">{sourceName || "Unknown"}</span>
      </div>
      
      <div className="flex justify-between">
        <span>Last Run:</span>
        <span>
          {lastExecutionTime ? 
            new Date(lastExecutionTime).toLocaleString() : 
            "Never"}
        </span>
      </div>
      
      <div className="flex justify-between">
        <span>Row Count:</span>
        <span>{rowCount || 0}</span>
      </div>
    </div>
  );
}
