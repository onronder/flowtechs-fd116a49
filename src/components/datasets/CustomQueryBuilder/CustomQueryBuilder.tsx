
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ResourceSelector from "./ResourceSelector";
import FieldSelector from "./FieldSelector";
import QueryPreview from "./QueryPreview";
import ResultPreview from "./ResultPreview";
import { ChevronLeft, Loader2 } from "lucide-react";

interface CustomQueryBuilderProps {
  source: any;
  onSave: (queryData: { query: string; fields: string[]; resourceType: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CustomQueryBuilder({ source, onSave, onCancel, isLoading = false }: CustomQueryBuilderProps) {
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const { toast } = useToast();
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Custom Query Builder</h3>
      <p className="text-muted-foreground">
        This feature is currently under development.
      </p>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => {
            toast({
              title: "Not implemented",
              description: "This feature is currently under development.",
            });
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Dataset"
          )}
        </Button>
      </div>
    </div>
  );
}
