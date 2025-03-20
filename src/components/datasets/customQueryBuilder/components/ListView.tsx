
import { ScrollArea } from "@/components/ui/scroll-area";
import FieldItem from "./FieldItem";

interface ListViewProps {
  fields: any[];
  selectedFields: string[];
  onFieldToggle: (path: string) => void;
}

export default function ListView({ 
  fields, 
  selectedFields, 
  onFieldToggle 
}: ListViewProps) {
  return (
    <ScrollArea className="h-80">
      {fields
        .filter(field => field.isScalar)
        .map(field => (
          <FieldItem
            key={field.path}
            field={field}
            isSelected={selectedFields.includes(field.path)}
            onToggle={onFieldToggle}
            viewType="list"
          />
        ))}
    </ScrollArea>
  );
}
