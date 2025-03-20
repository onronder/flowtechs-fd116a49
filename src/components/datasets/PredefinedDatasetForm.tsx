
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft } from "lucide-react";
import { createDatasetFromTemplate } from "@/api/datasetsApi";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PredefinedDatasetFormProps {
  source: any;
  templates: any[];
  onBack: () => void;
  onComplete: () => void;
}

export default function PredefinedDatasetForm({ 
  source, 
  templates,
  onBack, 
  onComplete 
}: PredefinedDatasetFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dataset name.",
        variant: "destructive"
      });
      return;
    }
    
    if (!templateId) {
      toast({
        title: "Error",
        description: "Please select a template.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setCreating(true);
      
      const result = await createDatasetFromTemplate({
        name,
        description,
        source_id: source.id,
        template_id: templateId
      });
      
      // Check for success based on response structure
      if (result && !('error' in result)) {
        toast({
          title: "Success",
          description: "Dataset created successfully!"
        });
        
        onComplete();
      } else {
        toast({
          title: "Error",
          description: 'error' in result ? String(result.error) : "Failed to create dataset.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating dataset:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Create From Template</h3>
        <p className="text-muted-foreground">
          Create a dataset using a predefined template for {source.name}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Dataset Name</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            placeholder="Enter dataset name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea 
            id="description" 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter a description for this dataset"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="template">Select Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
              {templates.length === 0 && (
                <SelectItem value="none" disabled>
                  No templates available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create Dataset"}
          </Button>
        </div>
      </form>
    </div>
  );
}
