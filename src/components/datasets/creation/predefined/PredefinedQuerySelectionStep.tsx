
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PredefinedQuerySelectionStepProps {
  sourceType?: string;
  category: string | null;
  onSelect: (query: any) => void;
}

export default function PredefinedQuerySelectionStep({ 
  sourceType, 
  category, 
  onSelect 
}: PredefinedQuerySelectionStepProps) {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadPredefinedQueries() {
      if (!sourceType || !category) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Here we're mocking the queries based on category
        // In production, you'd fetch these from your API
        let mockQueries: any[] = [];
        
        if (sourceType === "shopify") {
          if (category === "orders") {
            mockQueries = [
              {
                id: "pre_recent_orders_dashboard",
                name: "Recent Orders Dashboard",
                description: "Comprehensive view of recent orders with customer and line item details",
                template: "pre_recent_orders_dashboard"
              },
              {
                id: "pre_sales_by_geographic_region",
                name: "Sales by Geographic Region",
                description: "Analyze sales distribution across different geographic regions",
                template: "pre_sales_by_geographic_region"
              },
              {
                id: "pre_order_fulfillment_status",
                name: "Order Fulfillment Status",
                description: "Track fulfillment status across all orders",
                template: "pre_order_fulfillment_status"
              },
              {
                id: "pre_discount_usage_summary",
                name: "Discount Usage Summary",
                description: "Analyze how discounts are being used across orders",
                template: "pre_discount_usage_summary"
              }
            ];
          } else if (category === "products") {
            mockQueries = [
              {
                id: "pre_product_catalog_snapshot",
                name: "Product Catalog Snapshot",
                description: "Comprehensive snapshot of your entire product catalog",
                template: "pre_product_catalog_snapshot"
              },
              {
                id: "pre_top_products_by_revenue",
                name: "Top Products by Revenue",
                description: "Identify your best-selling products by revenue",
                template: "pre_top_products_by_revenue"
              },
              {
                id: "pre_product_collection_membership",
                name: "Product Collection Membership",
                description: "Analyze which products belong to which collections",
                template: "pre_product_collection_membership"
              }
            ];
          } else if (category === "customers") {
            mockQueries = [
              {
                id: "pre_customer_acquisition_timeline",
                name: "Customer Acquisition Timeline",
                description: "Track customer acquisition over time",
                template: "pre_customer_acquisition_timeline"
              },
              {
                id: "pre_recent_customer_activity",
                name: "Recent Customer Activity",
                description: "Monitor recent customer activities and engagements",
                template: "pre_recent_customer_activity"
              }
            ];
          } else if (category === "inventory") {
            mockQueries = [
              {
                id: "pre_inventory_status_overview",
                name: "Inventory Status Overview",
                description: "Get a comprehensive view of your current inventory status",
                template: "pre_inventory_status_overview"
              }
            ];
          }
        }
        
        setQueries(mockQueries);
      } catch (err: any) {
        console.error("Error loading predefined queries:", err);
        setError(err.message || "Failed to load queries");
        toast({
          title: "Error",
          description: "Failed to load predefined queries",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadPredefinedQueries();
  }, [sourceType, category, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading available queries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">Error loading queries: {error}</p>
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">No predefined queries available for this category.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground mb-6">
        Select a predefined query to use as your dataset
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {queries.map(query => (
          <Card
            key={query.id}
            className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => onSelect(query)}
          >
            <div>
              <h3 className="font-medium text-lg">{query.name}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {query.description}
              </p>
              <div className="mt-4 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full inline-block">
                {category?.charAt(0).toUpperCase() + category?.slice(1)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
