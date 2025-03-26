
// src/components/datasets/DatasetTypeSelector.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Link2, Layers } from "lucide-react";

export interface DatasetTypeSelectorProps {
  sourceType?: string;
  onSelect: (type: "predefined" | "dependent" | "custom") => void;
  onBack?: () => void;
}

export default function DatasetTypeSelector({ sourceType, onSelect, onBack }: DatasetTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all"
          onClick={() => onSelect("predefined")}
        >
          <div className="flex flex-col items-center text-center">
            <Database className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-medium text-lg mb-2">Predefined Dataset</h3>
            <p className="text-sm text-muted-foreground">
              Use ready-made query templates to extract data quickly and easily.
            </p>
          </div>
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all"
          onClick={() => onSelect("dependent")}
        >
          <div className="flex flex-col items-center text-center">
            <Link2 className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-medium text-lg mb-2">Dependent Dataset</h3>
            <p className="text-sm text-muted-foreground">
              Combine multiple related queries to create comprehensive datasets with joined data.
            </p>
          </div>
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all"
          onClick={() => onSelect("custom")}
        >
          <div className="flex flex-col items-center text-center">
            <Layers className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-medium text-lg mb-2">Custom Dataset</h3>
            <p className="text-sm text-muted-foreground">
              Build your own custom query using our interactive query builder interface.
            </p>
          </div>
        </Card>
      </div>
      
      {onBack && (
        <div>
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
