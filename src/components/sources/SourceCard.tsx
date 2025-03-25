
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ClockIcon, ServerIcon } from "lucide-react";
import SourceActions from "./SourceActions";
import { format, formatDistance } from "date-fns";

export interface SourceCardProps {
  source: {
    id: string;
    name: string;
    description?: string | null;
    sourceType: string;
    lastValidatedAt?: string | null;
    apiVersion?: string;
  };
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isTesting?: boolean;
}

export default function SourceCard({
  source,
  onTest,
  onEdit,
  onDelete,
  isTesting = false
}: SourceCardProps) {
  const sourceTypeDisplay = {
    shopify: "Shopify",
    woocommerce: "WooCommerce",
    ftp_sftp: "FTP/SFTP",
    custom_api: "Custom API"
  }[source.sourceType] || source.sourceType;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{source.name}</CardTitle>
          <Badge variant="outline" className="rounded-full text-xs">
            {sourceTypeDisplay}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {source.description && (
          <p className="text-sm text-gray-500 mb-4">{source.description}</p>
        )}
        
        <div className="flex flex-col space-y-2">
          {source.lastValidatedAt && (
            <div className="flex items-center text-xs text-gray-500">
              <ClockIcon className="h-3.5 w-3.5 mr-2" />
              <span>Last validated {formatDistance(new Date(source.lastValidatedAt), new Date(), { addSuffix: true })}</span>
            </div>
          )}
          
          {source.apiVersion && source.sourceType === "shopify" && (
            <div className="flex items-center text-xs text-gray-500">
              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
              <span>API Version: <Badge variant="outline" className="ml-1 text-xs">{source.apiVersion}</Badge></span>
            </div>
          )}
          
          <div className="flex items-center text-xs text-gray-500">
            <ServerIcon className="h-3.5 w-3.5 mr-2" />
            <span>Source Type: {sourceTypeDisplay}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 flex justify-end border-t">
        <SourceActions 
          id={source.id} 
          onTestSuccess={onTest}
          onEdit={onEdit}
          onDelete={onDelete}
          isTesting={isTesting}
        />
      </CardFooter>
    </Card>
  );
}
