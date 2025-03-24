
import React from "react";
import { Download } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import DataExport from "@/components/common/DataExport";

interface DatasetExportActionProps {
  executionId: string | undefined;
  datasetName: string;
}

export function DatasetExportAction({ executionId, datasetName }: DatasetExportActionProps) {
  if (!executionId) return null;
  
  return (
    <DropdownMenuItem className="flex items-center" id="export-action">
      <DataExport 
        executionId={executionId}
        datasetName={datasetName}
        showSaveOption={true}
        className="w-full flex items-center"
      />
    </DropdownMenuItem>
  );
}
