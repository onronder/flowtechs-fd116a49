
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Store } from "lucide-react";
import { formatDistance } from "date-fns";

interface SourceValidationDetailsProps {
  sourceType: string;
  validationResult: any;
  credentials: any;
}

export default function SourceValidationDetails({
  sourceType,
  validationResult,
  credentials
}: SourceValidationDetailsProps) {
  if (!validationResult || sourceType !== "shopify") {
    return null;
  }

  const { shopInfo } = validationResult;
  const apiVersion = validationResult.config?.api_version || credentials.api_version;
  
  if (!shopInfo) return null;

  return (
    <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
      <div className="font-medium text-gray-700">Store Information</div>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Store name:</span>
          <span className="text-sm font-medium">{shopInfo.name}</span>
        </div>
        
        {shopInfo.plan && (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Plan:</span>
            <span className="text-sm font-medium">{shopInfo.plan.displayName}</span>
          </div>
        )}
        
        {apiVersion && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">API Version:</span>
            <Badge variant="outline" className="text-xs font-medium bg-green-50">
              {apiVersion}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
