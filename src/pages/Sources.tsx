
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testSourceConnection, deleteSource } from "@/utils/sourceUtils";
import SourcesGrid from "@/components/sources/SourcesGrid";
import EmptySourcesState from "@/components/sources/EmptySourcesState";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useSources } from "@/hooks/useSources";
import { initializeSourceUpdates } from "@/utils/sourceUtils";

export default function Sources() {
  const { sources, loading, fetchSources } = useSources();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize the weekly source updates on component mount
  useEffect(() => {
    initializeSourceUpdates();
  }, []);

  async function handleDeleteSource(id: string) {
    const success = await deleteSource(id, toast);
    if (success) {
      fetchSources();
    }
  }

  async function handleTestConnection(id: string) {
    await testSourceConnection(id, toast);
    // Refresh sources after testing to get updated API version info
    fetchSources();
  }

  function handleAddNew() {
    navigate("/sources/new");
  }

  function handleEditSource(id: string) {
    navigate(`/sources/${id}/edit`);
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
          onEdit={handleEditSource}
          onDelete={handleDeleteSource}
          onAddNew={handleAddNew}
        />
      )}
    </div>
  );
}
