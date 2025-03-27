
import React from "react";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Users, Package, ArchiveIcon } from "lucide-react";

interface PredefinedCategoriesStepProps {
  sourceType?: string;
  onSelect: (category: string) => void;
}

export default function PredefinedCategoriesStep({ sourceType, onSelect }: PredefinedCategoriesStepProps) {
  // Only show categories relevant to the source type
  // For now, we're focusing on Shopify
  if (sourceType !== "shopify") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Predefined datasets are currently only available for Shopify sources.
        </p>
      </div>
    );
  }

  const categories = [
    {
      id: "orders",
      title: "Orders",
      description: "Order data, sales metrics, discounts, and fulfillment status",
      icon: ShoppingCart,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      id: "customers",
      title: "Customers",
      description: "Customer profiles, acquisition data, and purchase history",
      icon: Users,
      color: "text-blue-500", 
      bgColor: "bg-blue-500/10"
    },
    {
      id: "products",
      title: "Products",
      description: "Product catalog, variants, collections, and performance metrics",
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      id: "inventory",
      title: "Inventory",
      description: "Stock levels, inventory adjustments, and location data",
      icon: ArchiveIcon,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    }
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground mb-6">
        Select a category to view available predefined datasets
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(category => (
          <Card
            key={category.id}
            className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => onSelect(category.id)}
          >
            <div className="flex items-start">
              <div className={`${category.bgColor} p-3 rounded-full mr-4`}>
                <category.icon className={`h-6 w-6 ${category.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-lg">{category.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {category.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
