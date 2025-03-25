
import { Button } from "@/components/ui/button";
import { Database, Plus } from "lucide-react";

interface EmptySourcesStateProps {
  onAddNew: () => void;
}

export default function EmptySourcesState({ onAddNew }: EmptySourcesStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl bg-card/50">
      <div className="rounded-full bg-primary/10 p-6 mb-6">
        <Database className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No data sources connected</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Connect your first data source to start importing and transforming your data.
        FlowTechs supports Shopify, WooCommerce, FTP/SFTP, and Custom APIs.
      </p>
      <Button onClick={onAddNew}>
        <Plus className="mr-2 h-4 w-4" />
        Create a New Data Source
      </Button>
    </div>
  );
}
