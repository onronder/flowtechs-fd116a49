
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatasetCard from "@/components/datasets/DatasetCard";
import EmptyDatasetsState from "@/components/datasets/EmptyDatasetsState";
import { fetchUserDatasets, fetchRecentOrdersDashboard } from "@/api/datasetsApi";
import NewDatasetModal from "@/components/datasets/NewDatasetModal";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const { toast } = useToast();

  const loadDatasets = useCallback(async () => {
    try {
      console.log("Loading datasets...");
      setLoading(true);
      
      const data = await fetchUserDatasets();
      console.log(`Loaded ${data.length} datasets`);
      
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
      toast({
        title: "Error",
        description: "Failed to load datasets. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);
  
  // Function to force refresh datasets
  const handleRefresh = useCallback(() => {
    console.log("Manually refreshing datasets...");
    loadDatasets();
  }, [loadDatasets]);

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Datasets</h1>
          <p className="text-muted-foreground">Manage your data extractions</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Dataset
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : datasets.length === 0 ? (
        <EmptyDatasetsState onCreateNew={() => setShowNewModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map(dataset => (
            <DatasetCard 
              key={dataset.id}
              dataset={dataset}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewDatasetModal 
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onDatasetCreated={handleRefresh}
        />
      )}
    </div>
  );
}
