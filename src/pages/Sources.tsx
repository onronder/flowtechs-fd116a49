
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSources } from "@/hooks/useSources";
import SourcesGrid from "@/components/sources/SourcesGrid";
import EmptySourcesState from "@/components/sources/EmptySourcesState";

export default function Sources() {
  const { sources, loading: isLoading, error, fetchSources: refetch } = useSources();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading sources",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      toast({
        title: "Error refreshing sources",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleTestSource = (id: string) => {
    setTestingSourceId(id);
    // Logic for testing would go here
    // After testing completes:
    setTimeout(() => {
      setTestingSourceId(null);
      handleRefresh();
    }, 1000);
  };
  
  const handleEditSource = (id: string) => {
    navigate(`/sources/${id}/edit`);
  };
  
  const handleDeleteSource = (id: string) => {
    // Delete source logic would go here
    toast({
      title: "Source deleted",
      description: "The source has been successfully deleted."
    });
    handleRefresh();
  };
  
  const handleAddNew = () => {
    navigate('/sources/add');
  };

  const formattedSources = sources.map(source => ({
    ...source,
    sourceType: source.source_type,
    lastValidatedAt: source.last_validated_at,
    apiVersion: source.config?.api_version
  }));

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Data Sources</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading || isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button asChild>
            <Link to="/sources/add">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : sources.length === 0 ? (
        <EmptySourcesState onAddNew={handleAddNew} />
      ) : (
        <SourcesGrid 
          sources={formattedSources} 
          onTest={handleTestSource}
          onEdit={handleEditSource}
          onDelete={handleDeleteSource}
          onAddNew={handleAddNew}
          testingSourceId={testingSourceId}
        />
      )}
    </div>
  );
}
