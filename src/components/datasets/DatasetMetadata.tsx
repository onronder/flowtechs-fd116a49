
import React from "react";
import { Badge } from "@/components/ui/badge";
import { getDatasetTypeStyles } from "@/utils/datasetTypeUtils";

interface DatasetMetadataProps {
  name: string;
  description?: string;
  datasetType: string;
}

export default function DatasetMetadata({ 
  name, 
  description, 
  datasetType 
}: DatasetMetadataProps) {
  const typeStyles = getDatasetTypeStyles(datasetType);
  
  return (
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-lg font-medium">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      <Badge variant="outline" className={typeStyles.color}>{typeStyles.label}</Badge>
    </div>
  );
}
