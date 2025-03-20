
import { ScrollArea } from "@/components/ui/scroll-area";
import FieldItem from "./FieldItem";

interface TreeViewProps {
  fields: any[];
  selectedFields: string[];
  expandedNodes: Set<string>;
  onFieldToggle: (path: string) => void;
  onNodeToggle: (path: string) => void;
}

export default function TreeView({ 
  fields, 
  selectedFields, 
  expandedNodes, 
  onFieldToggle, 
  onNodeToggle 
}: TreeViewProps) {
  return (
    <ScrollArea className="h-80">
      {fields.map(field => (
        <FieldItem
          key={field.path}
          field={field}
          isSelected={selectedFields.includes(field.path)}
          onToggle={onFieldToggle}
          onToggleExpand={onNodeToggle}
          isExpanded={expandedNodes.has(field.path)}
          viewType="tree"
        />
      ))}
    </ScrollArea>
  );
}
