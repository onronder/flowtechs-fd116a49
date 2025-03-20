
import React from "react";

interface SourceInfoDisplayProps {
  sourceType: string;
  name: string;
  description?: string;
}

export default function SourceInfoDisplay({ sourceType, name, description }: SourceInfoDisplayProps) {
  const getSourceTypeName = (type: string) => {
    switch (type) {
      case "shopify": return "Shopify";
      case "woocommerce": return "WooCommerce";
      case "ftp_sftp": return "FTP/SFTP";
      case "custom_api": return "Custom API";
      default: return "Unknown";
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-medium mb-1">Source Information</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="font-medium">Type:</div>
        <div>{getSourceTypeName(sourceType)}</div>
        <div className="font-medium">Name:</div>
        <div>{name}</div>
        {description && (
          <>
            <div className="font-medium">Description:</div>
            <div>{description}</div>
          </>
        )}
      </div>
    </div>
  );
}
