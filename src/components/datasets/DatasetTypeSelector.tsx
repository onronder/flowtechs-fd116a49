// src/components/datasets/DatasetTypeSelector.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface DatasetTypeSelectorProps {
  sourceType?: string; // Make this optional to fix the error
  onSelect: (type: "predefined" | "dependent" | "custom") => void;
  onBack?: () => void; // Make this optional to match usage in NewDatasetModal
}

export default function DatasetTypeSelector({ sourceType, onSelect, onBack }: DatasetTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="p-4 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelect("predefined")}
        >
          <h3 className="font-medium text-lg mb-2">Predefined Dataset</h3>
          <p className="text-sm text-muted-foreground">
            Create a dataset using predefined query templates.
          </p>
        </Card>
        
        <Card 
          className="p-4 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelect("dependent")}
        >
          <h3 className="font-medium text-lg mb-2">Dependent Dataset</h3>
          <p className="text-sm text-muted-foreground">
            Create a dataset that combines multiple related queries.
          </p>
        </Card>
        
        <Card 
          className="p-4 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelect("custom")}
        >
          <h3 className="font-medium text-lg mb-2">Custom Dataset</h3>
          <p className="text-sm text-muted-foreground">
            Build your own custom query using the query builder.
          </p>
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