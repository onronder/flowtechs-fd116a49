
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CreateSourceStepper from "@/components/sources/CreateSourceStepper";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { fetchSourceById } from "@/api/sourceApi";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function EditSource() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSource(id);
    }
  }, [id]);

  async function loadSource(sourceId: string) {
    try {
      setLoading(true);
      const sourceData = await fetchSourceById(sourceId);
      setSource(sourceData);
    } catch (error) {
      console.error("Error loading source:", error);
      toast({
        title: "Error",
        description: "Failed to load source details. Please try again.",
        variant: "destructive"
      });
      navigate("/sources");
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = () => {
    navigate("/sources");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4" 
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Data Source</h1>
          <p className="text-muted-foreground">Update your data source</p>
        </div>
      </div>

      {source && <CreateSourceStepper existingSource={source} onCancel={handleCancel} />}
    </div>
  );
}
