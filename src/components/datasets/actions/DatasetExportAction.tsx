
import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataExport from "@/components/common/DataExport";

interface DatasetExportActionProps {
  executionId: string | undefined;
  datasetName: string;
}

export function DatasetExportAction({ executionId, datasetName }: DatasetExportActionProps) {
  if (!executionId) return null;
  
  return (
    <DataExport 
      executionId={executionId}
      datasetName={datasetName}
      showSaveOption={true}
      className="w-full flex items-center"
    />
  );
}
