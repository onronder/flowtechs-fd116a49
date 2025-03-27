
import { Button } from "@/components/ui/button";
import { Database, Plus } from "lucide-react";

interface EmptyDatasetsStateProps {
  onCreateNew: () => void;
}

export default function EmptyDatasetsState({ onCreateNew }: EmptyDatasetsStateProps) {
  return (
    <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="bg-muted rounded-full p-4 mb-4">
        <Database className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold mb-2">No Datasets Yet</h2>
      
      <p className="text-muted-foreground max-w-md mb-6">
        Create your first dataset to start extracting and organizing data from your connected sources.
      </p>
      
      <Button onClick={onCreateNew} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Your First Dataset
      </Button>
    </div>
  );
}
