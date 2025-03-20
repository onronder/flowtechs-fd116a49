
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface FieldSelectorProps {
  resource: any;
  schema: any;
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

export default function FieldSelector({ resource, schema, selectedFields, onFieldsChange }: FieldSelectorProps) {
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

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search fields..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'tree' | 'list')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tree">Tree View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tree" className="border rounded-md p-4">
          <ScrollArea className="h-80">
            {filteredFields.map(field => (
              <div key={field.path} className="py-1">
                <div className="flex items-center">
                  <Checkbox
                    id={`tree-${field.path}`}
                    checked={selectedFields.includes(field.path)}
                    onCheckedChange={() => toggleField(field.path)}
                    disabled={!field.isScalar}
                  />
                  <Label
                    htmlFor={`tree-${field.path}`}
                    className={`ml-2 text-sm ${!field.isScalar ? 'font-medium' : ''} ${!field.isScalar ? 'cursor-pointer' : ''}`}
                    onClick={() => !field.isScalar && toggleExpandNode(field.path)}
                  >
                    {field.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({field.type})
                    </span>
                  </Label>
                  {!field.isScalar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={() => toggleExpandNode(field.path)}
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
            ))}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="list" className="border rounded-md p-4">
          <ScrollArea className="h-80">
            {filteredFields
              .filter(field => field.isScalar)
              .map(field => (
                <div key={field.path} className="py-1 flex items-start">
                  <Checkbox
                    id={`list-${field.path}`}
                    checked={selectedFields.includes(field.path)}
                    onCheckedChange={() => toggleField(field.path)}
                  />
                  <div className="ml-2">
                    <Label
                      htmlFor={`list-${field.path}`}
                      className="text-sm cursor-pointer"
                    >
                      {field.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({field.type})
                      </span>
                    </Label>
                    {field.description && (
                      <p className="text-xs text-muted-foreground">
                        {field.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="text-sm text-muted-foreground">
        Selected {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
