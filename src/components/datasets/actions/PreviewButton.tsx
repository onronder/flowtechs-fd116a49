
import React from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface PreviewButtonProps {
  onClick: (e?: React.MouseEvent) => void;
  disabled: boolean;
}

export function PreviewButton({ onClick, disabled }: PreviewButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={(e) => onClick(e)}
      disabled={disabled}
      id="preview-dataset-button"
      name="preview-dataset-button"
    >
      <Eye className="h-4 w-4 mr-1" />
      Preview
    </Button>
  );
}
