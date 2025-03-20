
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchField from "./components/SearchField";
import TreeView from "./components/TreeView";
import ListView from "./components/ListView";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [fields, setFields] = useState<any[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'tree' | 'list'>('tree');

  useEffect(() => {
    // Find fields for the selected resource
    if (resource && schema) {
      const resourceType = schema?.types?.find((t: any) => t.name === resource.name);
      if (resourceType && resourceType.fields) {
        // Map fields to a more usable format
        const mappedFields = resourceType.fields.map((field: any) => ({
          name: field.name,
          description: field.description,
          type: getFieldTypeName(field.type),
          isScalar: isScalarType(field.type),
          path: field.name
        }));
        
        setFields(mappedFields);
      }
    }
  }, [resource, schema]);

  function getFieldTypeName(typeRef: any): string {
    if (!typeRef) return 'Unknown';
    
    if (typeRef.kind === 'NON_NULL') {
      return `${getFieldTypeName(typeRef.ofType)}!`;
    }
    
    if (typeRef.kind === 'LIST') {
      return `[${getFieldTypeName(typeRef.ofType)}]`;
    }
    
    return typeRef.name || 'Unknown';
  }

  function isScalarType(typeRef: any): boolean {
    if (!typeRef) return false;
    
    if (typeRef.kind === 'NON_NULL' || typeRef.kind === 'LIST') {
      return isScalarType(typeRef.ofType);
    }
    
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID'];
    return scalarTypes.includes(typeRef.name);
  }

  function toggleField(path: string) {
    const newSelectedFields = [...selectedFields];
    const index = newSelectedFields.indexOf(path);
    
    if (index >= 0) {
      newSelectedFields.splice(index, 1);
    } else {
      newSelectedFields.push(path);
    }
    
    onFieldsChange(newSelectedFields);
  }

  function toggleExpandNode(path: string) {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  }

  function selectAllFields() {
    onFieldsChange(fields.filter(f => f.isScalar).map(f => f.path));
  }

  function deselectAllFields() {
    onFieldsChange([]);
  }

  // Filter fields based on search term
  const filteredFields = fields.filter(field => 
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (field.description && field.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    field.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Select Fields for {resource.name}</h3>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={selectAllFields}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAllFields}>
            Deselect All
          </Button>
        </div>
      </div>

      <SearchField 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        placeholder="Search fields..."
      />

      <Tabs value={view} onValueChange={(v) => setView(v as 'tree' | 'list')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tree">Tree View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tree" className="border rounded-md p-4">
          <TreeView 
            fields={filteredFields}
            selectedFields={selectedFields}
            expandedNodes={expandedNodes}
            onFieldToggle={toggleField}
            onNodeToggle={toggleExpandNode}
          />
        </TabsContent>
        
        <TabsContent value="list" className="border rounded-md p-4">
          <ListView 
            fields={filteredFields}
            selectedFields={selectedFields}
            onFieldToggle={toggleField}
          />
        </TabsContent>
      </Tabs>

      <div className="text-sm text-muted-foreground">
        Selected {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
