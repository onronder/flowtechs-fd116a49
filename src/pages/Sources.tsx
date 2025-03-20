
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchUserSources } from "@/api/sourceApi";
import { testSourceConnection, deleteSource } from "@/utils/sourceUtils";
import SourcesGrid from "@/components/sources/SourcesGrid";
import EmptySourcesState from "@/components/sources/EmptySourcesState";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function Sources() {
  const [sources, setSources] = useState([]);
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

  async function handleDeleteSource(id: string) {
    const success = await deleteSource(id, toast);
    if (success) {
      setSources(sources.filter(s => s.id !== id));
    }
  }

  async function handleTestConnection(id: string) {
    await testSourceConnection(id, toast);
  }

  function handleAddNew() {
    window.location.href = "/sources/new";
  }

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Data Sources</h1>
          <p className="text-muted-foreground">Connect to your data sources</p>
        </div>
        
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : sources.length === 0 ? (
        <EmptySourcesState onAddNew={handleAddNew} />
      ) : (
        <SourcesGrid
          sources={sources}
          onTest={handleTestConnection}
          onEdit={(id) => window.location.href = `/sources/${id}/edit`}
          onDelete={handleDeleteSource}
          onAddNew={handleAddNew}
        />
      )}
    </div>
  );
}
