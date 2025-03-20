
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Source, useSources } from "@/hooks/useSources";
import SourcesGrid from "@/components/sources/SourcesGrid";
import EmptySourcesState from "@/components/sources/EmptySourcesState";
import CreateSourceStepper from "@/components/sources/CreateSourceStepper";
import { testSourceConnection, deleteSource } from "@/utils/sourceUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const Sources = () => {
  const { sources, loading, fetchSources } = useSources();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<Source | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Source action handlers
  async function handleTestSource(id: string) {
    const sourceToTest = sources.find(s => s.id === id);
    if (!sourceToTest) return;
    
    const shouldRefresh = await testSourceConnection(id, sourceToTest, toast);
    if (shouldRefresh) {
      fetchSources();
    }
  }

  async function handleDeleteSource(id: string) {
    const success = await deleteSource(id, toast);
    if (success) {
      fetchSources();
    }
  }

  function handleEditSource(id: string) {
    const source = sources.find(s => s.id === id);
    if (source) {
      setSourceToEdit(source);
      setShowCreateForm(true);
    }
  }

  function handleAddNew() {
    setSourceToEdit(null);
    setShowCreateForm(true);
  }

  function handleCancelCreate() {
    setShowCreateForm(false);
    setSourceToEdit(null);
  }

  // If not authenticated, the AuthRoute component will handle redirect
  if (!user) {
    return null;
  }

  return (
    <div className="h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Sources</h1>
          <p className="text-muted-foreground">Manage your data sources</p>
        </div>
        
        {!showCreateForm && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        )}
      </div>

      {showCreateForm ? (
        <CreateSourceStepper 
          existingSource={sourceToEdit} 
          onCancel={handleCancelCreate} 
        />
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : sources.length === 0 ? (
        <EmptySourcesState onAddNew={handleAddNew} />
      ) : (
        <SourcesGrid 
          sources={sources} 
          onTest={handleTestSource}
          onEdit={handleEditSource}
          onDelete={handleDeleteSource}
          onAddNew={handleAddNew}
        />
      )}
    </div>
  );
};

export default Sources;
