
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPredefinedDataset } from "@/api/datasets/datasetCreationApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  sourceId: z.string().min(1, {
    message: "Please select a source.",
  }),
  templateName: z.string().min(1, {
    message: "Please select a template.",
  }),
});

// Define the predefined templates that map to our edge functions
const PREDEFINED_TEMPLATES = [
  {
    name: "pre_customer_acquisition_timeline",
    display_name: "Customer Acquisition Timeline",
    description: "Track new customer sign-ups over time to analyze growth patterns."
  },
  {
    name: "pre_recent_orders_dashboard",
    display_name: "Recent Orders Dashboard",
    description: "A dashboard of recent orders from your Shopify store with sorting and filtering capabilities."
  },
  {
    name: "pre_order_fulfillment_status",
    display_name: "Order Fulfillment Status",
    description: "Track the fulfillment status of orders including shipping information and delivery status."
  },
  {
    name: "pre_sales_by_geographic_region",
    display_name: "Sales by Geographic Region",
    description: "Analyze sales performance across different geographic regions to identify market trends."
  },
  {
    name: "pre_discount_usage_summary",
    display_name: "Discount Usage Summary",
    description: "Monitor the usage and effectiveness of discount codes and promotions."
  },
  {
    name: "pre_product_catalog_snapshot",
    display_name: "Product Catalog Snapshot",
    description: "A complete snapshot of your product catalog including pricing, inventory, and categorization info."
  },
  {
    name: "pre_product_collection_membership",
    display_name: "Product Collection Membership",
    description: "See which products belong to which collections to better organize your catalog."
  },
  {
    name: "pre_top_products_by_revenue",
    display_name: "Top Products by Revenue",
    description: "Identify your best-selling products based on revenue to optimize your inventory."
  },
  {
    name: "pre_inventory_status_overview",
    display_name: "Inventory Status Overview",
    description: "Get a comprehensive view of current inventory levels across products and locations."
  },
  {
    name: "pre_recent_customer_activity",
    display_name: "Recent Customer Activity",
    description: "Monitor recent customer actions including orders, account updates, and engagement."
  }
];

interface PredefinedDatasetFormProps {
  source: any;
  templates?: any[];
  onSuccess?: (datasetId: string) => void;
  onCancel?: () => void;
  onBack?: () => void;
  onComplete?: () => void;
}

export default function PredefinedDatasetForm({
  source,
  templates = [],
  onSuccess,
  onCancel,
  onBack,
  onComplete,
}: PredefinedDatasetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState(PREDEFINED_TEMPLATES);
  const { toast } = useToast();

  // Use the hardcoded templates directly since we've moved to individual edge functions
  useEffect(() => {
    console.log("Source type:", source?.source_type);
    // If we want to filter templates by source type in the future, we can do it here
  }, [source]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      sourceId: source?.id || "",
      templateName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      console.log("Form values:", values);
      
      // Find the template from our list to get additional info if needed
      const selectedTemplate = availableTemplates.find(
        template => template.name === values.templateName
      );
      
      if (!selectedTemplate) {
        console.error("Template not found:", values.templateName);
        throw new Error(`Template "${values.templateName}" not found`);
      }
      
      console.log("Selected template:", selectedTemplate);
      
      // Prepare the payload for API - now using template name directly
      const payload = {
        name: values.name,
        description: values.description || "",
        sourceId: values.sourceId,
        templateId: values.templateName, // Using the edge function name as template_id
      };
      
      console.log("Creating dataset with payload:", payload);
      
      // Create the dataset
      const result = await createPredefinedDataset(payload);

      console.log("Dataset creation result:", result);
      
      toast({
        title: "Dataset Created",
        description: "Your dataset has been created successfully.",
      });

      if (onSuccess) {
        onSuccess(result.id);
      }
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error creating dataset:", error);
      toast({
        title: "Error",
        description: "Failed to create dataset. Please try again: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My Dataset" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for your dataset.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Description of what this dataset contains"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description of the dataset's purpose.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Source</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a data source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={source.id}>
                    {source.name}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The source from which to pull data.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="templateName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The predefined template to use for this dataset.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Dataset
          </Button>
        </div>
      </form>
    </Form>
  );
}
