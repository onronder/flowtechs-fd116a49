
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testSourceConnection, deleteSource } from "@/utils/sourceUtils";
import SourcesGrid from "@/components/sources/SourcesGrid";
import EmptySourcesState from "@/components/sources/EmptySourcesState";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useSources } from "@/hooks/useSources";
import { initializeSourceUpdates } from "@/utils/sourceUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Sources() {
  const { sources, loading, error: fetchError, fetchSources } = useSources();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize the weekly source updates on component mount
  useEffect(() => {
    initializeSourceUpdates();
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchSources();
      toast({
        title: "Sources refreshed",
        description: "Your data sources have been refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh sources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchSources, toast]);

  async function handleDeleteSource(id: string) {
    try {
      const success = await deleteSource(id, toast);
      if (success) {
        fetchSources();
      }
    } catch (error) {
      console.error("Error deleting source:", error);
      toast({
        title: "Delete failed",
        description: "An unexpected error occurred while deleting the source.",
        variant: "destructive",
      });
    }
  }

  async function handleTestConnection(id: string) {
    setTestingSource(id);
    try {
      const result = await testSourceConnection(id, toast);
      
      // If the test was successful but reported an update
      if (result && result.updated) {
        toast({
          title: "API Version Updated",
          description: result.message || "The source API version was updated successfully.",
          variant: "default",
        });
      }
      
      // Refresh sources after testing to get updated timestamps and API version info
      // Delay slightly to ensure backend updates are complete
      setTimeout(() => {
        fetchSources();
        setTestingSource(null);
      }, 1000);
    } catch (error) {
      setTestingSource(null);
      console.error("Error in handleTestConnection:", error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
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
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Source
          </Button>
        </div>
      </div>

      {fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {fetchError}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 mt-1" 
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground mt-4">Loading your data sources...</p>
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
          testingSourceId={testingSource}
        />
      )}
    </div>
  );
}
