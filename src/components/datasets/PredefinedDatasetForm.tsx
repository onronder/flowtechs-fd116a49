
// src/components/datasets/PredefinedDatasetForm.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchPredefinedTemplates, createPredefinedDataset } from "@/api/datasetsApi";
import { supabase } from "@/integrations/supabase/client";

interface PredefinedDatasetFormProps {
  source: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function PredefinedDatasetForm({ source, onBack, onComplete }: PredefinedDatasetFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      const data = await fetchPredefinedTemplates();
      
      // Update templates to include a "Recent Orders Dashboard" template if source is Shopify
      if (source.source_type === 'shopify') {
        // Create a custom template object with required properties to match the regular template type
        const recentOrdersTemplate = {
          id: 'recent-orders-dashboard',
          display_name: 'Recent Orders Dashboard',
          description: 'A dashboard of recent orders from your Shopify store with sorting and filtering capabilities.',
          name: 'recent_orders_dashboard',
          type: 'predefined',
          resource_type: 'orders',
          query_template: '', // Not used for direct API
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          field_list: null,
          is_direct_api: true // Custom property to identify direct API templates
        };
        
        // Add the template to the beginning of the array
        data.unshift(recentOrdersTemplate);
      }
      
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplate(data[0].id);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
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
      
      // Check if this is a direct API template
      const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);
      
      if (selectedTemplateObj?.is_direct_api) {
        // For the Recent Orders Dashboard, create a special dataset entry
        const { data, error } = await supabase
          .from("user_datasets")
          .insert({
            name,
            description,
            source_id: source.id,
            dataset_type: "direct_api",
            parameters: {
              edge_function: "pre_recent_orders_dashboard",
              template_name: selectedTemplateObj.display_name
            },
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select();
          
        if (error) throw error;
        
      } else {
        // Use the standard createPredefinedDataset for other templates
        await createPredefinedDataset({
          name,
          description,
          sourceId: source.id,
          templateId: selectedTemplate
        });
      }
      
      onComplete();
    } catch (error) {
      console.error("Error creating dataset:", error);
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
    return <div className="py-4 text-center">Loading templates...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <Label htmlFor="template">Query Template</Label>
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
        {selectedTemplate && (
          <p className="text-sm text-muted-foreground mt-2">
            {templates.find(t => t.id === selectedTemplate)?.description}
          </p>
        )}
      </div>
      <div className="flex justify-between pt-4 mt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={creating}>
          {creating ? "Creating..." : "Create Dataset"}
        </Button>
      </div>
    </form>
  );
}
