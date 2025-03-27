
import React from "react";
import { Card } from "@/components/ui/card";
import { DatabaseIcon, Link2, Layers } from "lucide-react";

interface DatasetTypeSelectionStepProps {
  sourceType?: string;
  onSelect: (type: "predefined" | "dependent" | "custom") => void;
}

export default function DatasetTypeSelectionStep({ sourceType, onSelect }: DatasetTypeSelectionStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground mb-6">
        Choose the type of dataset you want to create based on your needs and technical expertise.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all h-full"
          onClick={() => onSelect("predefined")}
        >
          <div className="flex flex-col h-full">
            <div className="bg-blue-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <DatabaseIcon className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-medium text-lg mb-3">Predefined Datasets</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Ready-to-use dataset templates designed for common business needs. Ideal for quick insights 
              without requiring technical knowledge.
            </p>
            <div className="mt-4 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full inline-block">
              Recommended for all users
            </div>
          </div>
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all h-full"
          onClick={() => onSelect("dependent")}
        >
          <div className="flex flex-col h-full">
            <div className="bg-purple-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <Link2 className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="font-medium text-lg mb-3">Dependent Datasets</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Advanced datasets that combine multiple API calls to create comprehensive data views.
              Perfect for complex data relationships and complete analysis.
            </p>
            <div className="mt-4 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full inline-block">
              For intermediate users
            </div>
          </div>
        </Card>
        
        <Card 
          className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all h-full"
          onClick={() => onSelect("custom")}
        >
          <div className="flex flex-col h-full">
            <div className="bg-amber-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <Layers className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-medium text-lg mb-3">Custom Datasets</h3>
            <p className="text-sm text-muted-foreground flex-grow">
              Build your own custom queries using our interactive query builder.
              Maximum flexibility for specific requirements and unique use cases.
            </p>
            <div className="mt-4 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full inline-block">
              For advanced users
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
