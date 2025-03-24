
import React from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Clock, Edit, Trash } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { DatasetExportAction } from "./DatasetExportAction";

interface DatasetActionsMenuProps {
  lastExecutionId?: string;
  datasetName?: string;
  onViewPreview: () => void;
  onScheduleDataset: () => void;
  onDeleteDataset: () => void;
}

export function DatasetActionsMenu({
  lastExecutionId,
  datasetName = "dataset",
  onViewPreview,
  onScheduleDataset,
  onDeleteDataset
}: DatasetActionsMenuProps) {
  const { toast } = useToast();

  const handleEditClick = () => {
    toast({ 
      title: "Coming Soon", 
      description: "Edit functionality will be available soon." 
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          id="dataset-actions-menu"
          name="dataset-actions-menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewPreview} id="view-results-action">
          <Eye className="h-4 w-4 mr-2" />
          View Results
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onScheduleDataset} id="schedule-action">
          <Clock className="h-4 w-4 mr-2" />
          Schedule
        </DropdownMenuItem>
        <DatasetExportAction 
          executionId={lastExecutionId} 
          datasetName={datasetName} 
        />
        <DropdownMenuItem 
          onClick={handleEditClick}
          id="edit-action"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDeleteDataset} className="text-red-600" id="delete-action">
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
