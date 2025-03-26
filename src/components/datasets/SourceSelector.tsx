
// src/components/datasets/SourceSelector.tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSources } from "@/hooks/useSources";
import { useToast } from "@/hooks/use-toast";
import ShopifyIcon from "@/components/icons/ShopifyIcon";
import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
import FtpIcon from "@/components/icons/FtpIcon";
import ApiIcon from "@/components/icons/ApiIcon";
import { Loader2 } from "lucide-react";

export interface SourceSelectorProps {
  onSelect: (source: any) => void;
}

export default function SourceSelector({ onSelect }: SourceSelectorProps) {
  const { sources, loading, error } = useSources();
  const { toast } = useToast();

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
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">No data sources found. Please connect a data source first.</p>
        <Button 
          onClick={() => window.location.href = '/sources/add'} 
          variant="default"
        >
          Add Data Source
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium mb-4">Select a Data Source</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map(source => (
          <Card
            key={source.id}
            className="p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => onSelect(source)}
          >
            <div className="flex items-center">
              <div className="mr-4">
                {getSourceIcon(source.source_type)}
              </div>
              <div>
                <h4 className="font-medium">{source.name}</h4>
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
