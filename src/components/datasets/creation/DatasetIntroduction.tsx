
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, ArrowRight } from "lucide-react";

interface DatasetIntroductionProps {
  onContinue: () => void;
}

export default function DatasetIntroduction({ onContinue }: DatasetIntroductionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start mb-4">
            <div className="bg-primary/10 p-3 rounded-full mr-4">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">What are Datasets?</h2>
              <p className="text-muted-foreground">
                Datasets are structured collections of data extracted from your connected sources. 
                They allow you to retrieve specific information you need for analysis, visualization, 
                or export.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Predefined Datasets</h3>
              <p className="text-sm text-muted-foreground">
                Ready-to-use datasets with carefully designed queries that extract common data patterns. 
                Ideal for standard reporting needs with no configuration required.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Dependent Datasets</h3>
              <p className="text-sm text-muted-foreground">
                Advanced datasets that combine multiple related queries to create comprehensive data views.
                Perfect for complex data that requires multiple API calls to fully extract.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Custom Datasets</h3>
              <p className="text-sm text-muted-foreground">
                Build your own custom queries using our interactive query builder. 
                Ideal for specific requirements that aren't covered by predefined options.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">How Datasets Work</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Once created, your datasets can be:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center">
                <span className="bg-primary/20 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">1</span>
                <span>Run on-demand to get the latest data</span>
              </li>
              <li className="flex items-center">
                <span className="bg-primary/20 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">2</span>
                <span>Scheduled to run automatically at regular intervals</span>
              </li>
              <li className="flex items-center">
                <span className="bg-primary/20 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">3</span>
                <span>Exported to CSV, Excel, or JSON formats</span>
              </li>
              <li className="flex items-center">
                <span className="bg-primary/20 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">4</span>
                <span>Used as inputs for transformations and visualizations</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onContinue} className="gap-2">
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
