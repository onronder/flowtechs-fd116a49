import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchPredefinedTemplates, createPredefinedDataset } from "@/api/datasetsApi";
import { ChevronLeft, Loader2, Tag, Database, LayoutList } from "lucide-react";

interface PredefinedDatasetFormProps {
  source: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function PredefinedDatasetForm({ 
  source, 
  onBack, 
  onComplete 
}: PredefinedDatasetFormProps) {
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
      const data = await fetchPredefinedTemplates();
      
      const filteredTemplates = data
        .filter(template => 
          (source.source_type === "shopify" && template.resource_type) ||
          template.resource_type === source.source_type
        )
        .sort((a, b) => a.display_name.localeCompare(b.display_name));
      
      setTemplates(filteredTemplates);
      
      if (filteredTemplates.length > 0) {
        setSelectedTemplate(filteredTemplates[0].id);
      }
    } catch (err) {
      console.error("Error loading templates:", err);
      setError("Failed to load query templates. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load query templates. Please try again.",
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
        title: "Missing Fields",
        description: "Please enter a dataset name.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedTemplate) {
      toast({
        title: "Missing Fields",
        description: "Please select a template.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setCreating(true);
      setError("");
      
      await createPredefinedDataset({
        name,
        description,
        sourceId: source.id,
        templateId: selectedTemplate
      });
      
      toast({
        title: "Dataset Created",
        description: "Your dataset has been created successfully.",
      });
      
      onComplete();
    } catch (err: any) {
      console.error("Error creating dataset:", err);
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

  const selectedTemplateObject = templates.find(t => t.id === selectedTemplate);

  const getFieldList = (template: any) => {
    if (!template) return [];
    const fieldList = template.field_list;
    return Array.isArray(fieldList) ? fieldList : [];
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const resourceType = template.resource_type || 'Other';
    if (!acc[resourceType]) {
      acc[resourceType] = [];
    }
    acc[resourceType].push(template);
    return acc;
  }, {} as Record<string, any[]>);

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

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          <Database className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Templates Available</h3>
          <p className="text-muted-foreground mb-4">
            No predefined templates are available for this source type.
          </p>
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
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Dataset Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Shopify Products"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template">Query Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedTemplates).map(([groupName, groupTemplates]) => (
                  <div key={groupName} className="py-2">
                    <div className="px-2 text-xs font-medium text-muted-foreground mb-1 uppercase">
                      {groupName}
                    </div>
                    {groupTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.display_name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      </div>
      
      {selectedTemplate && (
        <div className="text-sm text-muted-foreground mt-2">
          <p>{templates.find(t => t.id === selectedTemplate)?.description}</p>
          
          {templates.find(t => t.id === selectedTemplate)?.resource_type && (
            <div className="mt-2 p-3 bg-muted rounded-md">
              <h4 className="font-medium mb-1">Data fields included:</h4>
              <ul className="list-disc list-inside">
                {template && Array.isArray(template.field_list) && template.field_list.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      
      <div className="flex justify-between pt-4">
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
  );
}
