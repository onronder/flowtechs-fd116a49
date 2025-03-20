
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FieldSelectorProps {
  resource: any;
  schema: any;
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

export default function FieldSelector({
  resource,
  schema,
  selectedFields,
  onFieldsChange
}: FieldSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select Fields</h3>
      <p className="text-muted-foreground">
        This component is currently under development.
      </p>
    </div>
  );
}
