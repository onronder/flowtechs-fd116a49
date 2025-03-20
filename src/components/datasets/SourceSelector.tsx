
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Database, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ShopifyIcon from "@/components/icons/ShopifyIcon";
import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
import FtpIcon from "@/components/icons/FtpIcon";
import ApiIcon from "@/components/icons/ApiIcon";

interface SourceSelectorProps {
  sources: any[];
  loading: boolean;
  onSelect: (source: any) => void;
}

export default function SourceSelector({ sources, loading, onSelect }: SourceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter sources based on search query
  const filteredSources = sources.filter(source => 
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (source.description && source.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get icon based on source type
  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'shopify':
        return <ShopifyIcon className="h-6 w-6" />;
      case 'woocommerce':
        return <WooCommerceIcon className="h-6 w-6" />;
      case 'ftp_sftp':
        return <FtpIcon className="h-6 w-6" />;
      case 'custom_api':
        return <ApiIcon className="h-6 w-6" />;
      default:
        return <Database className="h-6 w-6" />;
    }
  };

  // Get color based on source type
  const getSourceTypeStyles = (type: string) => {
    switch (type) {
      case 'shopify':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
      case 'woocommerce':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400';
      case 'ftp_sftp':
        return 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400';
      case 'custom_api':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-lg p-6">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Data Sources Found</h3>
        <p className="text-muted-foreground mb-4">
          You need to connect a data source before creating a dataset.
        </p>
        <p className="text-sm text-muted-foreground">
          Go to the Sources page to connect your first data source.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search sources..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map((source) => (
          <Card 
            key={source.id}
            className="cursor-pointer hover:border-primary hover:shadow-sm transition-colors"
            onClick={() => onSelect(source)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${getSourceTypeStyles(source.source_type)}`}>
                    {getSourceIcon(source.source_type)}
                  </div>
                  <div>
                    <h3 className="font-medium leading-none mb-1">{source.name}</h3>
                    {source.description && (
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {source.source_type.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-2 border-t text-xs text-muted-foreground">
                <div>Connected: {new Date(source.created_at).toLocaleDateString()}</div>
                <div>
                  Status: <span className="text-green-600 dark:text-green-400">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSources.length === 0 && (
          <div className="col-span-full text-center py-6 border rounded-lg">
            <p className="text-muted-foreground">
              No sources matching your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
