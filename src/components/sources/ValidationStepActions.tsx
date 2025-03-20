
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ValidationStepActionsProps {
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  existingId?: string;
}

export default function ValidationStepActions({ 
  onBack, 
  onSave, 
  isSaving, 
  existingId 
}: ValidationStepActionsProps) {
  return (
    <div className="flex justify-between pt-4">
      <Button type="button" variant="outline" onClick={onBack}>
        Back
      </Button>
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {existingId ? "Updating..." : "Creating..."}
          </>
        ) : (
          existingId ? "Update Source" : "Create Source"
        )}
      </Button>
    </div>
  );
}
