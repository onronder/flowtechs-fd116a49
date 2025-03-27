
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";

export interface CustomQueryBuilderProps {
  source: any;
  onComplete: (queryData: any) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function CustomQueryBuilder({ 
  source, 
  onComplete, 
  onBack, 
  isLoading = false 
}: CustomQueryBuilderProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Custom Query Builder</h3>
      <p className="text-muted-foreground">
        This feature is currently under development. You'll be able to create custom GraphQL queries
        for your Shopify data source.
      </p>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => {
            toast({
              title: "Not implemented",
              description: "Custom query builder is currently under development.",
            });
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
