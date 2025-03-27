
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Organize templates by category
const TEMPLATE_CATEGORIES = {
  "products": [
    {
      id: "dep_product_variants",
      name: "Product Variants",
      description: "Fetch all variants for each product, including pricing, inventory, and option combinations.",
      is_direct_api: true
    },
    {
      id: "dep_product_media_and_images",
      name: "Product Media and Images",
      description: "Extract all media assets (images, videos, 3D models) associated with products, including full metadata.",
      is_direct_api: true
    },
    {
      id: "dep_product_collections",
      name: "Product Collections",
      description: "Get all collections that each product belongs to for better catalog organization.",
      is_direct_api: true
    }
  ],
  "orders": [
    {
      id: "dep_order_line_items",
      name: "Order Line Items",
      description: "Retrieve detailed information about items purchased in each order, including variants and properties.",
      is_direct_api: true
    },
    {
      id: "dep_order_transactions",
      name: "Order Transactions",
      description: "Get payment transaction details for each order, including amounts, gateway info, and status.",
      is_direct_api: true
    },
    {
      id: "dep_fulfillment_details",
      name: "Fulfillment Details",
      description: "Access shipping and fulfillment information for each order, including tracking numbers and carriers.",
      is_direct_api: true
    },
    {
      id: "dep_draft_order_conversions",
      name: "Draft Order Conversions",
      description: "Track which draft orders have been converted to actual orders and when.",
      is_direct_api: true
    }
  ],
  "customers": [
    {
      id: "dep_customer_order_history",
      name: "Customer Order History",
      description: "See the complete order history for each customer, including order values and frequencies.",
      is_direct_api: true
    },
    {
      id: "dep_customer_tags_and_segments",
      name: "Customer Tags and Segments",
      description: "Analyze customer tags and segmentation data to better target marketing efforts.",
      is_direct_api: true
    }
  ],
  "inventory": [
    {
      id: "dep_inventory_across_locations",
      name: "Inventory Across Locations",
      description: "View inventory levels for products across all of your locations for better stock management.",
      is_direct_api: true
    }
  ]
};

interface DependentQuerySelectionStepProps {
  sourceType: string;
  category: string | null;
  onSelect: (query: any) => void;
}

export default function DependentQuerySelectionStep({ sourceType, category, onSelect }: DependentQuerySelectionStepProps) {
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
