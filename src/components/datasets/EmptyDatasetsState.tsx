
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function EmptyDatasetsState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-6">
        <PlusCircle className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">No datasets yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Create a dataset to extract and transform data from your sources.
      </p>
      
      <Button onClick={onCreateNew}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Create Your First Dataset
      </Button>
    </div>
  );
}
