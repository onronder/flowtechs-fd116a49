
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";

interface ResourceSelectorProps {
  resources: any[];
  onSelect: (resource: any) => void;
}

export default function ResourceSelector({ resources, onSelect }: ResourceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter resources based on search term
  const filteredResources = resources.filter(resource => 
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResources.map(resource => (
          <Card 
            key={resource.name}
            className="p-4 cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect(resource)}
          >
            <h3 className="font-medium">{resource.name}</h3>
            {resource.description && (
              <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
            )}
          </Card>
        ))}
        
        {filteredResources.length === 0 && (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No resources matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}
