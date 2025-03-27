
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Organize templates by category
const TEMPLATE_CATEGORIES = {
  "orders": [
    {
      id: "pre_recent_orders_dashboard",
      name: "Recent Orders Dashboard",
      description: "A dashboard of recent orders from your Shopify store with sorting and filtering capabilities.",
      is_direct_api: true
    },
    {
      id: "pre_order_fulfillment_status",
      name: "Order Fulfillment Status",
      description: "Track the fulfillment status of orders including shipping information and delivery status.",
      is_direct_api: true
    },
    {
      id: "pre_sales_by_geographic_region",
      name: "Sales by Geographic Region",
      description: "Analyze sales performance across different geographic regions to identify market trends.",
      is_direct_api: true
    },
    {
      id: "pre_discount_usage_summary",
      name: "Discount Usage Summary",
      description: "Monitor the usage and effectiveness of discount codes and promotions.",
      is_direct_api: true
    }
  ],
  "products": [
    {
      id: "pre_product_catalog_snapshot",
      name: "Product Catalog Snapshot",
      description: "A complete snapshot of your product catalog including pricing, inventory, and categorization info.",
      is_direct_api: true
    },
    {
      id: "pre_product_collection_membership",
      name: "Product Collection Membership",
      description: "See which products belong to which collections to better organize your catalog.",
      is_direct_api: true
    },
    {
      id: "pre_top_products_by_revenue",
      name: "Top Products by Revenue",
      description: "Identify your best-selling products based on revenue to optimize your inventory.",
      is_direct_api: true
    }
  ],
  "customers": [
    {
      id: "pre_customer_acquisition_timeline",
      name: "Customer Acquisition Timeline",
      description: "Track new customer sign-ups over time to analyze growth patterns.",
      is_direct_api: true
    },
    {
      id: "pre_recent_customer_activity",
      name: "Recent Customer Activity",
      description: "Monitor recent customer actions including orders, account updates, and engagement.",
      is_direct_api: true
    }
  ],
  "inventory": [
    {
      id: "pre_inventory_status_overview",
      name: "Inventory Status Overview",
      description: "Get a comprehensive view of current inventory levels across products and locations.",
      is_direct_api: true
    }
  ]
};

interface PredefinedQuerySelectionStepProps {
  sourceType: string;
  category: string | null;
  onSelect: (query: any) => void;
}

export default function PredefinedQuerySelectionStep({ sourceType, category, onSelect }: PredefinedQuerySelectionStepProps) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  
  useEffect(() => {
    if (category && TEMPLATE_CATEGORIES[category as keyof typeof TEMPLATE_CATEGORIES]) {
      setTemplates(TEMPLATE_CATEGORIES[category as keyof typeof TEMPLATE_CATEGORIES]);
    } else {
      setTemplates([]);
    }
  }, [category]);

  const handleSelect = (template: any) => {
    onSelect({
      name: template.name,
      description: template.description,
      template: template.id
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => handleSelect(template)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-muted-foreground">
                {template.description}
              </CardDescription>
              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="secondary" onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(template);
                }}>
                  Select
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No templates available for this category.</p>
        </div>
      )}
    </div>
  );
}
