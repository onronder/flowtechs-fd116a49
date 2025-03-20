
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DependentDatasetFormProps {
  source: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function DependentDatasetForm({
  source,
  onBack,
  onComplete
}: DependentDatasetFormProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Configure Dependent Dataset</h3>
      <p className="text-muted-foreground">
        This feature is currently under development.
      </p>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={() => {
            toast({
              title: "Not implemented",
              description: "This feature is currently under development.",
            });
          }}
        >
          Create Dataset
        </Button>
      </div>
    </div>
  );
}
