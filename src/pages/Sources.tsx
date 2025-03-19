
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SourcesGrid from "@/components/sources/SourcesGrid";
import EmptySourcesState from "@/components/sources/EmptySourcesState";
import CreateSourceStepper from "@/components/sources/CreateSourceStepper";

const Sources = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSources();
  }, []);

  async function fetchSources() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setSources(data || []);
    } catch (error) {
      console.error("Error fetching sources:", error);
      toast({
        title: "Error",
        description: "Failed to load sources. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTestSource(id: string) {
    const sourceToTest = sources.find(s => s.id === id);
    if (!sourceToTest) return;
    
    try {
      toast({
        title: "Testing connection...",
        description: "Please wait while we test your source connection.",
      });
      
      // Test connection based on source type
      const response = await fetch("/api/validateSourceConnection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: sourceToTest.source_type,
          config: sourceToTest.config,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${sourceToTest.name}`,
        });
        
        // Update source if API version changed
        if (sourceToTest.source_type === "shopify" && 
            result.config.api_version !== sourceToTest.config.api_version) {
          
          await supabase
            .from("sources")
            .update({ 
              config: result.config,
              last_validated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", id);
          
          // Refresh source list
          fetchSources();
        }
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to the source.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing source:", error);
      toast({
        title: "Error",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteSource(id: string) {
    if (confirm("Are you sure you want to delete this source? This action cannot be undone.")) {
      try {
        const { error } = await supabase
          .from("sources")
          .delete()
          .eq("id", id);
        
        if (error) throw error;
        
        toast({
          title: "Source Deleted",
          description: "The source has been deleted successfully.",
        });
        
        // Refresh source list
        fetchSources();
      } catch (error) {
        console.error("Error deleting source:", error);
        toast({
          title: "Error",
          description: "Failed to delete the source. Please try again.",
          variant: "destructive",
        });
      }
    }
  }

  function handleEditSource(id: string) {
    const sourceToEdit = sources.find(s => s.id === id);
    if (sourceToEdit) {
      setSourceToEdit(sourceToEdit);
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
