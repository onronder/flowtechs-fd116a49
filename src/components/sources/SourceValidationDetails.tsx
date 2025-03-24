import React from "react";
import { Badge } from "@/components/ui/badge";
import { redactSensitiveInfo } from "@/api/utils/securityUtils";

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
  if (!validationResult) return null;
  
  // Create a safe version of credentials without sensitive info
  const safeCredentials = React.useMemo(() => {
    // For display, only keep API version and storeName/domain
    const safeData: Record<string, any> = {};
    
    if (credentials) {
      if ('api_version' in credentials) {
        safeData.api_version = credentials.api_version;
      }
      
      if ('storeName' in credentials) {
        safeData.storeName = credentials.storeName;
      }
      
      if ('domain' in credentials) {
        safeData.domain = credentials.domain;
      }
    }
    
    return safeData;
  }, [credentials]);

  return (
    <>
      {/* Render Shopify specific info if available */}
      {sourceType === "shopify" && validationResult.shopInfo && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-1">Shopify Shop Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Shop Name:</div>
            <div>{validationResult.shopInfo.name}</div>
            <div className="font-medium">Plan:</div>
            <div>{validationResult.shopInfo.plan?.displayName || "N/A"}</div>
            <div className="font-medium">API Version:</div>
            <div className="flex items-center">
              {safeCredentials.api_version}
              {safeCredentials.api_version && (
                <Badge className="ml-2" variant="outline">
                  Current Version
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render WooCommerce specific info if available */}
      {sourceType === "woocommerce" && validationResult.shopInfo && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-1">WooCommerce Site Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Site URL:</div>
            <div>{validationResult.shopInfo.name}</div>
            <div className="font-medium">Connection Status:</div>
            <div>{validationResult.shopInfo.connectionStatus}</div>
            <div className="font-medium">API Version:</div>
            <div>{safeCredentials.api_version || "v3"}</div>
          </div>
        </div>
      )}

      {/* Render FTP/SFTP specific info if available */}
      {sourceType === "ftp_sftp" && validationResult.connectionInfo && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-1">FTP/SFTP Connection Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Host:</div>
            <div>{validationResult.connectionInfo.host}</div>
            <div className="font-medium">Protocol:</div>
            <div>{validationResult.connectionInfo.protocol}</div>
            <div className="font-medium">Status:</div>
            <div>{validationResult.connectionInfo.connectionStatus}</div>
          </div>
        </div>
      )}

      {/* Render Custom API specific info if available */}
      {sourceType === "custom_api" && validationResult.apiInfo && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-1">Custom API Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Base URL:</div>
            <div>{validationResult.apiInfo.baseUrl}</div>
            <div className="font-medium">Status:</div>
            <div>{validationResult.apiInfo.connectionStatus}</div>
          </div>
        </div>
      )}
    </>
  );
}
