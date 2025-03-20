
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchDependentTemplates, createDependentDataset } from "@/api/datasetsApi";
import { ChevronLeft, Loader2 } from "lucide-react";

interface DependentDatasetFormProps {
  source: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function DependentDatasetForm({ source, onBack, onComplete }: DependentDatasetFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError("");
      // Fetch dependent query templates from the API
      const data = await fetchDependentTemplates();
      setTemplates(data);
      
      // Select the first template by default if available
      if (data.length > 0) {
        setSelectedTemplate(data[0].id);
      }
    } catch (err) {
      console.error("Error loading dependent templates:", err);
      setError("Failed to load dependent query templates. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load dependent query templates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

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
    
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Please select a template.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setCreating(true);
      setError("");
      // Create the dependent dataset using the API
      await createDependentDataset({
        name,
        description,
        sourceId: source.id,
        templateId: selectedTemplate
      });
      
      toast({
        title: "Dataset Created",
        description: "Your dependent dataset has been created successfully.",
      });
      
      // Call onComplete to move to the next step
      onComplete();
    } catch (err: any) {
      console.error("Error creating dependent dataset:", err);
      setError(err.message || "Failed to create the dataset. Please try again.");
      toast({
        title: "Error",
        description: "Failed to create the dataset. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error && templates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-6 border border-destructive/50 rounded-lg bg-destructive/10 text-center">
          <p className="text-destructive font-medium mb-4">{error}</p>
          <Button onClick={loadTemplates} variant="outline" size="sm">
            Retry
          </Button>
        </div>
        <div className="flex justify-start">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Dataset Name</Label>
        <Input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Shopify Products with Variants"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description of what this dataset contains"
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="template">Dependent Query Template</Label>
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map(template => (
              <SelectItem key={template.id} value={template.id}>
                {template.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedTemplate && templates.length > 0 && (
          <div className="text-sm text-muted-foreground mt-2">
            <p>{templates.find(t => t.id === selectedTemplate)?.description}</p>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <h4 className="font-medium mb-1">How it works:</h4>
              <p>{templates.find(t => t.id === selectedTemplate)?.help_text || "This template fetches related data by executing multiple queries and merging the results."}</p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      
      <div className="flex justify-between pt-4 mt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button type="submit" disabled={creating}>
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
  );
}
