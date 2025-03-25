
import React from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface PreviewButtonProps {
  onClick: () => void;
  disabled: boolean;
}

export function PreviewButton({ onClick, disabled }: PreviewButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    onClick();
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      id="preview-dataset-button"
      name="preview-dataset-button"
    >
      <Eye className="h-4 w-4 mr-1" />
      Preview
    </Button>
  );
}
