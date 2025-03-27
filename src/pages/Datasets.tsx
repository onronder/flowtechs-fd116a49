
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import DatasetCard from "@/components/datasets/DatasetCard";
import EmptyDatasetsState from "@/components/datasets/EmptyDatasetsState";
import { fetchUserDatasets, fetchRecentOrdersDashboard } from "@/api/datasetsApi";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { resetStuckExecutions } from "@/api/datasets/execution/executionResetApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadDatasets = useCallback(async () => {
    try {
      console.log("Loading datasets...");
      setLoading(true);
      setLoadError(null);
      
      const data = await fetchUserDatasets();
      console.log(`Loaded ${data.length} datasets`);
      
      // Reset any stuck executions
      if (data.length > 0) {
        try {
          for (const dataset of data) {
            const { resetCount } = await resetStuckExecutions(dataset.id);
            if (resetCount > 0) {
              console.log(`Reset ${resetCount} stuck executions for dataset ${dataset.id}`);
            }
          }
        } catch (resetError) {
          console.error("Error resetting stuck executions:", resetError);
          // Continue loading datasets even if reset fails
        }
      }
      
      // Check for datasets that use the direct API access
      const enhancedData = data.map(dataset => {
        if (dataset.dataset_type === 'direct_api' && 
            dataset.parameters && 
            typeof dataset.parameters === 'object' && 
            'edge_function' in dataset.parameters && 
            dataset.parameters.edge_function === 'pre_recent_orders_dashboard') {
          return {
            ...dataset,
            _specialHandling: {
              previewFunction: fetchRecentOrdersDashboard,
              displayName: (typeof dataset.parameters === 'object' && 
                            'template_name' in dataset.parameters) 
                            ? dataset.parameters.template_name 
                            : 'Recent Orders Dashboard'
            }
          };
        }
        return dataset;
      });
      
      setDatasets(enhancedData);
    } catch (error) {
      console.error("Error loading datasets:", error);
      setLoadError("Failed to load datasets. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load datasets. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);
  
  // Function to force refresh datasets
  const handleRefresh = useCallback(() => {
    console.log("Manually refreshing datasets...");
    setIsRefreshing(true);
    loadDatasets();
  }, [loadDatasets]);

  // Retry loading if there was an error
  const handleRetry = useCallback(() => {
    console.log("Retrying dataset load after error");
    loadDatasets();
  }, [loadDatasets]);

  // Handler for successful dataset creation or deletion
  const handleDatasetChange = useCallback(() => {
    console.log("Dataset changed (created/deleted), refreshing list...");
    handleRefresh();
  }, [handleRefresh]);

  // Navigate to create dataset page
  const handleCreateNew = useCallback(() => {
    navigate("/datasets/create");
  }, [navigate]);

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Datasets</h1>
          <p className="text-muted-foreground">Manage your data extractions</p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Dataset
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {loadError}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 mt-1" 
              onClick={handleRetry}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : datasets.length === 0 ? (
        <EmptyDatasetsState onCreateNew={handleCreateNew} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map(dataset => (
            <DatasetCard 
              key={dataset.id}
              dataset={dataset}
              onRefresh={handleDatasetChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
