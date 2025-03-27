
import React from "react";
import { useSources } from "@/hooks/useSources";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import ShopifyIcon from "@/components/icons/ShopifyIcon";
import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
import FtpIcon from "@/components/icons/FtpIcon";
import ApiIcon from "@/components/icons/ApiIcon";

interface SourceSelectionStepProps {
  onSelect: (source: any) => void;
}

export default function SourceSelectionStep({ onSelect }: SourceSelectionStepProps) {
  const { sources, loading, error } = useSources();
  
  const getSourceIcon = (sourceType: string) => {
    switch (sourceType.toLowerCase()) {
      case 'shopify':
        return <ShopifyIcon className="h-8 w-8" />;
      case 'woocommerce':
        return <WooCommerceIcon className="h-8 w-8" />;
      case 'ftp':
        return <FtpIcon className="h-8 w-8" />;
      default:
        return <ApiIcon className="h-8 w-8" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading data sources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">Error loading sources: {error}</p>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">No data sources found. Please connect a data source first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-6">
        Select a data source to create a dataset from. Only validated data sources are shown.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map(source => (
          <Card
            key={source.id}
            className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => onSelect(source)}
          >
            <div className="flex items-center">
              <div className="mr-4 p-2 bg-primary/10 rounded-lg">
                {getSourceIcon(source.source_type)}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg">{source.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {source.source_type === 'shopify' ? 'Shopify' : 
                   source.source_type === 'woocommerce' ? 'WooCommerce' :
                   source.source_type}
                </p>
                {source.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {source.description}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
