
import { ShoppingBag, Store, Upload, Globe } from "lucide-react";
import ShopifyIcon from "@/components/icons/ShopifyIcon";
import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
import FtpIcon from "@/components/icons/FtpIcon";
import ApiIcon from "@/components/icons/ApiIcon";

interface SourceTypeSelectionProps {
  onSelect: (type: string) => void;
}

export default function SourceTypeSelection({ onSelect }: SourceTypeSelectionProps) {
  const sourceTypes = [
    {
      id: "shopify",
      name: "Shopify",
      description: "Connect to your Shopify store to import products, customers, orders and more.",
      icon: <ShopifyIcon className="h-10 w-10" />,
      color: "#5c6ac4"
    },
    {
      id: "woocommerce",
      name: "WooCommerce",
      description: "Connect to your WooCommerce store to import products, customers, orders and more.",
      icon: <WooCommerceIcon className="h-10 w-10" />,
      color: "#7f54b3"
    },
    {
      id: "ftp_sftp",
      name: "FTP / SFTP",
      description: "Connect to your FTP or SFTP server to import data files.",
      icon: <FtpIcon className="h-10 w-10" />,
      color: "#22c55e"
    },
    {
      id: "custom_api",
      name: "Custom API",
      description: "Connect to a custom API to import data from any source.",
      icon: <ApiIcon className="h-10 w-10" />,
      color: "#3b82f6"
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sourceTypes.map(sourceType => (
        <button
          key={sourceType.id}
          onClick={() => onSelect(sourceType.id)}
          className="flex flex-col p-6 rounded-xl border border-border hover:border-primary hover:shadow-sm transition-all text-left"
          style={{ borderLeftWidth: "4px", borderLeftColor: sourceType.color }}
        >
          <div className="p-2 rounded-lg inline-flex mb-4" style={{ backgroundColor: `${sourceType.color}10`, color: sourceType.color }}>
            {sourceType.icon}
          </div>
          
          <h3 className="text-xl font-medium mb-2">{sourceType.name}</h3>
          <p className="text-muted-foreground">{sourceType.description}</p>
        </button>
      ))}
    </div>
  );
}
