
import React from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Send, Trash2, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { testSourceConnection, deleteSource } from "@/utils/sourceUtils";

interface SourceActionsProps {
  id: string;
  onTestSuccess?: () => void;
  onDelete?: () => void;
}

export default function SourceActions({ id, onTestSuccess, onDelete }: SourceActionsProps) {
  const { toast } = useToast();

  const handleTest = async () => {
    try {
      const result = await testSourceConnection(id, toast);
      if (result.success && onTestSuccess) {
        onTestSuccess();
      }
    } catch (error) {
      console.error("Error testing connection:", error);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this source? This action cannot be undone.")) {
      try {
        const success = await deleteSource(id, toast);
        if (success && onDelete) {
          onDelete();
        }
      } catch (error) {
        console.error("Error deleting source:", error);
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm" onClick={handleTest}>
        <Send className="h-4 w-4 mr-2" />
        Test Connection
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleTest}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Test Connection
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Source
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
