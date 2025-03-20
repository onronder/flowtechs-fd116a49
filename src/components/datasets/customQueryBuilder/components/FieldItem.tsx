
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

interface FieldItemProps {
  field: {
    name: string;
    description?: string;
    type: string;
    isScalar: boolean;
    path: string;
  };
  isSelected: boolean;
  onToggle: (path: string) => void;
  onToggleExpand?: (path: string) => void;
  isExpanded?: boolean;
  viewType: 'tree' | 'list';
}

export default function FieldItem({ 
  field, 
  isSelected, 
  onToggle, 
  onToggleExpand,
  isExpanded,
  viewType
}: FieldItemProps) {
  const isTree = viewType === 'tree';
  const id = `${viewType}-${field.path}`;
  
  return (
    <div className="py-1">
      <div className="flex items-center">
        <Checkbox
          id={id}
          checked={isSelected}
          onCheckedChange={() => onToggle(field.path)}
          disabled={!field.isScalar}
        />
        <Label
          htmlFor={id}
          className={`ml-2 text-sm ${!field.isScalar ? 'font-medium' : ''} ${!field.isScalar && isTree ? 'cursor-pointer' : ''}`}
          onClick={() => !field.isScalar && isTree && onToggleExpand && onToggleExpand(field.path)}
        >
          {field.name}
          <span className="ml-2 text-xs text-muted-foreground">
            ({field.type})
          </span>
        </Label>
        {!field.isScalar && isTree && onToggleExpand && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={() => onToggleExpand(field.path)}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        )}
      </div>
      {field.description && (
        <p className="text-xs text-muted-foreground ml-6">
          {field.description}
        </p>
      )}
    </div>
  );
}
