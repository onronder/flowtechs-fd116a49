
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DependentQuerySelectionStepProps {
  sourceType?: string;
  category: string | null;
  onSelect: (query: any) => void;
}

export default function DependentQuerySelectionStep({ 
  sourceType, 
  category, 
  onSelect 
}: DependentQuerySelectionStepProps) {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadDependentQueries() {
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
                id: "dep_order_line_items",
                name: "Order Line Items",
                description: "Detailed order data with complete line item information",
                template: "dep_order_line_items"
              },
              {
                id: "dep_order_transactions",
                name: "Order Transactions",
                description: "Order data with associated payment transactions",
                template: "dep_order_transactions"
              },
              {
                id: "dep_fulfillment_details",
                name: "Fulfillment Details",
                description: "Comprehensive order fulfillment information",
                template: "dep_fulfillment_details"
              },
              {
                id: "dep_draft_order_conversions",
                name: "Draft Order Conversions",
                description: "Track draft orders that converted to regular orders",
                template: "dep_draft_order_conversions"
              }
            ];
          } else if (category === "products") {
            mockQueries = [
              {
                id: "dep_product_variants",
                name: "Product Variants",
                description: "Complete product data with all variant information",
                template: "dep_product_variants"
              },
              {
                id: "dep_product_media_and_images",
                name: "Product Media & Images",
                description: "All product images and media assets in your catalog",
                template: "dep_product_media_and_images"
              },
              {
                id: "dep_product_collections",
                name: "Product Collections",
                description: "Products with their associated collections",
                template: "dep_product_collections"
              }
            ];
          } else if (category === "customers") {
            mockQueries = [
              {
                id: "dep_customer_order_history",
                name: "Customer Order History",
                description: "Customers with their complete order history",
                template: "dep_customer_order_history"
              },
              {
                id: "dep_customer_tags_and_segments",
                name: "Customer Tags & Segments",
                description: "Customer data with tags and segment information",
                template: "dep_customer_tags_and_segments"
              }
            ];
          } else if (category === "inventory") {
            mockQueries = [
              {
                id: "dep_inventory_across_locations",
                name: "Inventory Across Locations",
                description: "Inventory levels for products across all locations",
                template: "dep_inventory_across_locations"
              }
            ];
          }
        }
        
        setQueries(mockQueries);
      } catch (err: any) {
        console.error("Error loading dependent queries:", err);
        setError(err.message || "Failed to load queries");
        toast({
          title: "Error",
          description: "Failed to load dependent queries",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadDependentQueries();
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
        <p className="text-muted-foreground mb-4">No dependent queries available for this category.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground mb-6">
        Select a dependent query to use as your dataset
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
              <div className="mt-4 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full inline-block">
                {category?.charAt(0).toUpperCase() + category?.slice(1)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
