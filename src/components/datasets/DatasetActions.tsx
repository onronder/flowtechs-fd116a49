
import React from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Play, Download, Edit, Trash, Eye, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface DatasetActionsProps {
  datasetId: string;
  lastExecutionId?: string;
  isRunning: boolean;
  schedule?: {
    id: string;
    type: string;
    next_run_time?: string;
    is_active: boolean;
  };
  onViewPreview: () => void;
  onRunDataset: () => void;
  onScheduleDataset: () => void;
  onDeleteDataset: () => void;
}

export default function DatasetActions({
  datasetId,
  lastExecutionId,
  isRunning,
  schedule,
  onViewPreview,
  onRunDataset,
  onScheduleDataset,
  onDeleteDataset
}: DatasetActionsProps) {
  const { toast } = useToast();
  
  return (
    <div className="flex justify-between items-center w-full">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onViewPreview}
        disabled={!lastExecutionId}
      >
        <Eye className="h-4 w-4 mr-1" />
        Preview
      </Button>
      
      <div className="flex space-x-2">
        <Button 
          variant="default" 
          size="sm"
          onClick={onRunDataset}
          disabled={isRunning}
        >
          <Play className="h-4 w-4 mr-1" />
          {isRunning ? "Running..." : "Run"}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewPreview}>
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onScheduleDataset}>
              <Clock className="h-4 w-4 mr-2" />
              {schedule ? "Update Schedule" : "Schedule"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Export functionality will be available soon." })}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Edit functionality will be available soon." })}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteDataset} className="text-red-600">
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
