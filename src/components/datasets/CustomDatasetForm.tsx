
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";
import CustomQueryBuilder from "./customQueryBuilder/CustomQueryBuilder";

interface CustomDatasetFormProps {
  source: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function CustomDatasetForm({ source, onBack, onComplete }: CustomDatasetFormProps) {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCustomQueryComplete = async (queryData: {
    query: string;
    fields: string[];
    resourceType: string;
  }) => {
    // This would be implemented when the feature is ready
    toast({
      title: "Not implemented",
      description: "The custom query builder feature is currently under development.",
    });
  };

  return (
    <div className="space-y-6">
      <CustomQueryBuilder 
        source={source}
        onComplete={handleCustomQueryComplete}
        onBack={onBack}
        isLoading={creating}
      />
    </div>
  );
}
