import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchPredefinedTemplates, createPredefinedDataset } from "@/api/datasetsApi";
import { ChevronLeft, Loader2 } from "lucide-react";

interface PredefinedDatasetFormProps {
  source: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function PredefinedDatasetForm({ source, onBack, onComplete }: PredefinedDatasetFormProps) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await fetchPredefinedTemplates(source.source_type);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading predefined templates:", error);
      toast({
        title: "Error",
        description: "Failed to load predefined templates. Please try again.",
        variant: "destructive"
      });
    }
  }

  async function handleCreateDataset(e: React.FormEvent) {
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
      await createPredefinedDataset({
        source_id: source.id,
        template_id: selectedTemplate.id,
        name: name,
        description: description,
      });

      toast({
        title: "Success",
        description: "Dataset created successfully!",
      });
      onComplete();
    } catch (error) {
      console.error("Error creating predefined dataset:", error);
      toast({
        title: "Error",
        description: "Failed to create dataset. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  }

  // Fix the map issue with a type guard for template.field_list
  const templateFields = Array.isArray(selectedTemplate?.field_list)
    ? selectedTemplate.field_list.map((field: any) => (
        <li key={field.name} className="text-sm">
          {field.name} ({field.data_type})
        </li>
      ))
    : null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Configure Predefined Dataset</h3>
      <p className="text-muted-foreground">
        Select a predefined template and configure your dataset.
      </p>

      <form onSubmit={handleCreateDataset} className="space-y-4">
        <div>
          <Label htmlFor="name">Dataset Name</Label>
          <Input
            id="name"
            placeholder="My Dataset"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="A brief description of the dataset"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="template">Template</Label>
          <Select onValueChange={(value) => setSelectedTemplate(templates.find((t: any) => t.id === value))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template: any) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate && (
          <div className="space-y-4 mt-6">
            <h4 className="font-medium">Template Details</h4>
            <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
            {templateFields && templateFields.length > 0 && (
              <div>
                <h5 className="text-sm font-medium">Fields:</h5>
                <ul className="list-disc pl-5">
                  {templateFields}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
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
    </div>
  );
}
