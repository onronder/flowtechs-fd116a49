// src/components/datasets/SourceSelector.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchUserSources } from "@/api/sourcesApi";
import { useToast } from "@/hooks/use-toast";

export interface SourceSelectorProps {
  onSelect: (source: any) => void;
  // onBack is not in this component's props based on the error message
}

export default function SourceSelector({ onSelect }: SourceSelectorProps) {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      setLoading(true);
      const data = await fetchUserSources();
      setSources(data);
    } catch (error) {
      console.error("Error loading sources:", error);
      toast({
        title: "Error",
        description: "Failed to load sources. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="py-8 text-center">Loading sources...</div>;
  }

  if (sources.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">No sources found. Please connect a data source first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Select a Data Source</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map(source => (
          <Card
            key={source.id}
            className="p-4 cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect(source)}
          >
            <h4 className="font-medium">{source.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {source.source_type === 'shopify' ? 'Shopify' : source.source_type}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}