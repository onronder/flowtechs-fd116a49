
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CustomDatasetFormProps {
  source: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function CustomDatasetForm({
  source,
  onBack,
  onComplete
}: CustomDatasetFormProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Configure Custom Dataset</h3>
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
