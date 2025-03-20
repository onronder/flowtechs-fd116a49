import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createPredefinedDataset } from "@/api/datasetsApi";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DatasetTemplate {
  id: string;
  name: string;
  description: string;
  preview_image?: string;
}

interface PredefinedDatasetFormProps {
  source: any;
  templates: DatasetTemplate[];
  onBack: () => void;
  onComplete: () => void;
}

export default function PredefinedDatasetForm({ source, templates, onBack, onComplete }: PredefinedDatasetFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<DatasetTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  
  const { toast } = useToast();

  const handleTemplateSelect = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
    } else {
      setSelectedTemplate(templates[0]);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !selectedTemplate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setCreating(true);
      
      const result = await createPredefinedDataset({
        name,
        description,
        sourceId: source.id,
        templateId: selectedTemplate.id
      });
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Dataset created successfully."
        });
        onComplete();
      } else {
        setError(result.error || "Failed to create dataset.");
        toast({
          title: "Error",
          description: result.error || "Failed to create dataset.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating dataset:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Create Dataset from Template</h3>
      <p className="text-muted-foreground">
        Choose a pre-built template to quickly create a dataset.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Dataset Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your dataset"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Describe what this dataset will be used for"
              rows={3}
            />
          </div>
        </div>
        
        <div>
          <Label className="mb-2 block">Select a Template</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                {template.preview_image && (
                  <CardContent className="pt-0">
                    <img 
                      src={template.preview_image} 
                      alt={template.name} 
                      className="rounded border h-24 w-full object-cover"
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}
        
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button type="submit" disabled={creating || !selectedTemplate}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Dataset"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
