
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Database, GitMerge, Code, ChevronLeft } from "lucide-react";
import ShopifyIcon from "@/components/icons/ShopifyIcon";

interface DatasetTypeSelectorProps {
  sourceType: string;
  onSelect: (type: string) => void;
  onBack: () => void;
}

export default function DatasetTypeSelector({ 
  sourceType, 
  onSelect, 
  onBack 
}: DatasetTypeSelectorProps) {
  // Define all dataset types
  const datasetTypes = [
    {
      id: "predefined",
      title: "Predefined Dataset",
      description: "Use pre-built queries to extract common data like products, orders, or customers.",
      icon: <Database className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
      available: true, // Available for all source types
      recommended: true
    },
    {
      id: "dependent",
      title: "Dependent Dataset",
      description: "Create datasets that combine data from multiple related resources, like products with variants or orders with line items.",
      icon: <GitMerge className="h-5 w-5 text-purple-500" />,
      color: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
      available: sourceType === "shopify", // Only available for Shopify sources
      recommended: sourceType === "shopify"
    },
    {
      id: "custom",
      title: "Custom Dataset",
      description: "Build a custom dataset by selecting specific fields and creating your own GraphQL queries.",
      icon: <Code className="h-5 w-5 text-amber-500" />,
      color: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
      available: sourceType === "shopify", // Only available for Shopify sources
      advanced: true
    }
  ];
  
  return (
    <div className="space-y-6">
      {sourceType === "shopify" && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <ShopifyIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-medium text-blue-700 dark:text-blue-300">Shopify Source Detected</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              All dataset types are available for Shopify sources.
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {datasetTypes.map((type) => (
          <Card 
            key={type.id}
            className={`
              cursor-pointer border overflow-hidden transition-all
              ${type.available 
                ? "hover:border-primary hover:shadow-sm" 
                : "opacity-60 cursor-not-allowed"}
            `}
            onClick={() => type.available && onSelect(type.id)}
          >
            {type.recommended && (
              <div className="h-1.5 bg-primary w-full"></div>
            )}
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center text-base">
                  <div className={`p-2 rounded-md mr-2 ${type.color}`}>
                    {type.icon}
                  </div>
                  {type.title}
                </CardTitle>
                {type.advanced && (
                  <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded">
                    Advanced
                  </span>
                )}
              </div>
              <CardDescription className="pt-2">
                {type.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0 pb-3">
              {!type.available && (
                <p className="text-xs text-muted-foreground italic">
                  Only available for Shopify sources
                </p>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex justify-start pt-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Source Selection
        </Button>
      </div>
    </div>
  );
}
