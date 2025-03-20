
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatasetCard from "@/components/datasets/DatasetCard";
import EmptyDatasetsState from "@/components/datasets/EmptyDatasetsState";
import { fetchUserDatasets } from "@/api/datasetsApi";
import NewDatasetModal from "@/components/datasets/NewDatasetModal";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDatasets();
  }, []);

  async function loadDatasets() {
    try {
      setLoading(true);
      const data = await fetchUserDatasets();
      setDatasets(data);
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
  }

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Datasets</h1>
          <p className="text-muted-foreground">Manage your data extractions</p>
        </div>
        
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Dataset
        </Button>
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
              onRefresh={loadDatasets}
            />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewDatasetModal 
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onDatasetCreated={loadDatasets}
        />
      )}
    </div>
  );
}
