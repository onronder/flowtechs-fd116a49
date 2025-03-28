
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchPredefinedTemplates } from "@/api/datasetsApi";
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
      
      // Update templates to include the predefined special case templates
      if (source.source_type === 'shopify') {
        // Create custom template objects with required properties
        const customTemplates = [
          {
            id: 'customer-acquisition-timeline',
            display_name: 'Customer Acquisition Timeline',
            description: 'Track customer acquisition over time with first order conversion metrics.',
            name: 'customer_acquisition_timeline',
            type: 'predefined',
            resource_type: 'customers',
            query_template: '', // Not used for direct API
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            field_list: null,
            is_direct_api: true 
          },
          {
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
            is_direct_api: true
          },
          {
            id: 'order-fulfillment-status',
            display_name: 'Order Fulfillment Status',
            description: 'Track the fulfillment status of orders including shipping and delivery information.',
            name: 'order_fulfillment_status',
            type: 'predefined',
            resource_type: 'orders',
            query_template: '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            field_list: null,
            is_direct_api: true
          },
          {
            id: 'sales-by-geographic-region',
            display_name: 'Sales by Geographic Region',
            description: 'Analyze order distribution and sales by country, province, and city.',
            name: 'sales_by_geographic_region',
            type: 'predefined',
            resource_type: 'orders',
            query_template: '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            field_list: null,
            is_direct_api: true
          },
          {
            id: 'inventory-status-overview',
            display_name: 'Inventory Status Overview',
            description: 'Get a snapshot of your current inventory levels across all products and variants.',
            name: 'inventory_status_overview',
            type: 'predefined',
            resource_type: 'products',
            query_template: '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            field_list: null,
            is_direct_api: true
          }
        ];
        
        // Add the templates to the beginning of the array
        data.unshift(...customTemplates);
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
        // For direct API templates, create a special dataset entry
        let edgeFunction = '';
        
        // Determine which edge function to use based on the template
        if (selectedTemplateObj.id === 'customer-acquisition-timeline') {
          edgeFunction = 'pre_customer_acquisition_timeline';
        } else if (selectedTemplateObj.id === 'recent-orders-dashboard') {
          edgeFunction = 'pre_recent_orders_dashboard';
        } else if (selectedTemplateObj.id === 'order-fulfillment-status') {
          edgeFunction = 'pre_order_fulfillment_status';
        } else if (selectedTemplateObj.id === 'sales-by-geographic-region') {
          edgeFunction = 'pre_sales_by_geographic_region';
        } else if (selectedTemplateObj.id === 'inventory-status-overview') {
          edgeFunction = 'pre_inventory_status_overview';
        }
        
        const { data, error } = await supabase
          .from("user_datasets")
          .insert({
            name,
            description,
            source_id: source.id,
            dataset_type: "direct_api",
            parameters: {
              edge_function: edgeFunction,
              template_name: selectedTemplateObj.display_name
            },
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select();
          
        if (error) throw error;
        
      } else {
        // Use the standard createPredefinedDataset for other templates
        const { data, error } = await supabase
          .from("user_datasets")
          .insert({
            name,
            description,
            source_id: source.id,
            dataset_type: "predefined",
            template_id: selectedTemplate,
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select();
          
        if (error) throw error;
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
