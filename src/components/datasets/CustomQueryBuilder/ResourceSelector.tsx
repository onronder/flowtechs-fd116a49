
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface ResourceSelectorProps {
  resources: Array<{
    name: string;
    description?: string;
    type: string;
  }>;
  onSelect: (resource: any) => void;
}

export default function ResourceSelector({ resources, onSelect }: ResourceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter resources based on search query
  const filteredResources = resources.filter(resource => 
    resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (resource.description && resource.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Select API Resource</h2>
      <p className="text-muted-foreground">
        Choose a resource type to query from your Shopify store.
      </p>
      
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search resources..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {filteredResources.map((resource) => (
          <div
            key={resource.name}
            className="border rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
            onClick={() => onSelect(resource)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">{resource.name}</h3>
              <Badge variant="outline">{resource.type}</Badge>
            </div>
            {resource.description && (
              <p className="text-sm text-muted-foreground">{resource.description}</p>
            )}
          </div>
        ))}
        
        {filteredResources.length === 0 && (
          <div className="col-span-full flex items-center justify-center p-8 text-center border rounded-lg">
            <div>
              <p className="text-muted-foreground mb-2">No resources matching your search criteria.</p>
              {searchQuery && (
                <p className="text-sm">Try adjusting your search terms or browse all available resources.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
