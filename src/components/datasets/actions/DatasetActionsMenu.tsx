
import React from "react";
import { MoreVertical, Eye, Clock, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DatasetActionsMenuProps {
  onViewPreview: () => void;
  onScheduleDataset: () => void;
  onDeleteDataset: () => void;
}

export function DatasetActionsMenu({
  onViewPreview,
  onScheduleDataset,
  onDeleteDataset,
}: DatasetActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {
          onViewPreview();
        }}>
          <Eye className="mr-2 h-4 w-4" />
          View Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          onScheduleDataset();
        }}>
          <Clock className="mr-2 h-4 w-4" />
          Schedule Execution
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            onDeleteDataset();
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Dataset
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
