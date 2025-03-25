
import { formatDistance } from "date-fns";
import { Calendar, Tag, Database, Clock, Activity, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Source } from "@/hooks/useSources";

// Source-specific icons
import ShopifyIcon from "@/components/icons/ShopifyIcon";
import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
import FtpIcon from "@/components/icons/FtpIcon";
import ApiIcon from "@/components/icons/ApiIcon";

interface SourceCardProps {
  source: Source;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}

export default function SourceCard({ source, onEdit, onDelete, onTest }: SourceCardProps) {
  // Determine status indicator color
  const getStatusColor = (isActive: boolean, lastValidatedAt: string | null) => {
    if (!lastValidatedAt) return "bg-gray-400";
    if (!isActive) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  // Get source status
  const getSourceStatus = (isActive: boolean, lastValidatedAt: string | null) => {
    if (!lastValidatedAt) return "pending";
    if (!isActive) return "inactive";
    return "active";
  };
  
  // Icon mapping for source types
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "shopify": return <ShopifyIcon className="h-6 w-6" />;
      case "woocommerce": return <WooCommerceIcon className="h-6 w-6" />;
      case "ftp_sftp": return <FtpIcon className="h-6 w-6" />;
      case "custom_api": return <ApiIcon className="h-6 w-6" />;
      default: return <Database className="h-6 w-6" />;
    }
  };
  
  // Get source-specific color
  const getSourceColor = (type: string) => {
    switch (type) {
      case "shopify": return "#5c6ac4";
      case "woocommerce": return "#7f54b3";
      case "ftp_sftp": return "#22c55e";
      case "custom_api": return "#3b82f6";
      default: return "#64748b";
    }
  };
  
  // Get source-specific details to display
  const getSourceDetails = (source: Source) => {
    switch (source.source_type) {
      case "shopify":
        return {
          identifier: source.config.storeName || "Unknown Store",
          version: source.config.api_version || "Unknown"
        };
      case "woocommerce":
        return {
          identifier: source.config.site_url || "Unknown URL",
          version: source.config.api_version || "WC API"
        };
      case "ftp_sftp":
        return {
          identifier: source.config.host || "Unknown Host",
          version: source.config.protocol || "Unknown"
        };
      case "custom_api":
        return {
          identifier: source.config.base_url || "Unknown URL",
          version: "Custom"
        };
      default:
        return {
          identifier: "Unknown",
          version: "N/A"
        };
    }
  };
  
  const status = getSourceStatus(source.is_active, source.last_validated_at);
  const sourceColor = getSourceColor(source.source_type);
  const sourceDetails = getSourceDetails(source);
  const statusColor = getStatusColor(source.is_active, source.last_validated_at);

  return (
    <div className="relative rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        <div className={`h-3 w-3 rounded-full ${statusColor}`} title={`Status: ${status}`}></div>
      </div>
      
      {/* Top colored banner based on source type */}
      <div className="h-2 w-full" style={{ backgroundColor: sourceColor }}></div>
      
      <div className="p-5">
        {/* Header with icon and name */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${sourceColor}10`, color: sourceColor }}>
            {getSourceIcon(source.source_type)}
          </div>
          <div>
            <h3 className="text-lg font-medium">{source.name}</h3>
            <p className="text-sm text-muted-foreground">{sourceDetails.identifier}</p>
          </div>
        </div>
        
        {/* Meta information */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Updated {formatDistance(new Date(source.updated_at || new Date()), new Date(), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Tag className="h-4 w-4 mr-1" />
            <span>{sourceDetails.version}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Database className="h-4 w-4 mr-1" />
            <span>{source.datasets_count || 0} {source.datasets_count === 1 ? 'Dataset' : 'Datasets'}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>{source.jobs_count || 0} {source.jobs_count === 1 ? 'Job' : 'Jobs'}</span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-between pt-3 border-t">
          <Button
            onClick={() => onTest(source.id)}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
          >
            <Activity className="h-4 w-4 mr-1" />
            Test
          </Button>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => onEdit(source.id)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            
            <Button
              onClick={() => onDelete(source.id)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
