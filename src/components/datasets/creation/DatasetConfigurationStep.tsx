
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  createPredefinedDataset,
  createDependentDataset,
  createCustomDataset
} from "@/api/datasetsApi";

interface DatasetConfigurationStepProps {
  source: any;
  datasetType: "predefined" | "dependent" | "custom" | null;
  queryData: any;
  onComplete: () => void;
}

export default function DatasetConfigurationStep({
  source,
  datasetType,
  queryData,
  onComplete
}: DatasetConfigurationStepProps) {
  const [name, setName] = useState(queryData?.name || "");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Dataset name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      if (datasetType === "predefined") {
        await createPredefinedDataset({
          name,
          description,
          sourceId: source.id,
          templateId: queryData.template
        });
      } else if (datasetType === "dependent") {
        await createDependentDataset({
          name,
          description,
          sourceId: source.id,
          templateId: queryData.template
        });
      } else if (datasetType === "custom") {
        await createCustomDataset({
          name,
          description,
          sourceId: source.id,
          ...queryData
        });
      }
      
      toast({
        title: "Success",
        description: "Dataset created successfully",
      });
      
      onComplete();
    } catch (err: any) {
      console.error("Error creating dataset:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create dataset",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Dataset Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  placeholder="Enter a descriptive name for your dataset"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                  placeholder="Add details about what this dataset contains"
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Dataset Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Source</div>
                <div>{source?.name}</div>
                
                <div className="text-muted-foreground">Type</div>
                <div>
                  {datasetType === "predefined" ? "Predefined Dataset" : 
                   datasetType === "dependent" ? "Dependent Dataset" : 
                   "Custom Dataset"}
                </div>
                
                {queryData?.name && (
                  <>
                    <div className="text-muted-foreground">Template</div>
                    <div>{queryData.name}</div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Creating...
                  </>
                ) : (
                  "Create Dataset"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
