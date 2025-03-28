
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RunDatasetJobResult {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rowCount?: number;
  executionTime?: number;
}

export function useRunDatasetJob() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const { toast } = useToast();

  const run = async (datasetId: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Running dataset job for dataset ID: ${datasetId}`);
      
      // Call the Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke("Run_Dataset_Job", {
        body: { datasetId }
      });
      
      if (functionError) {
        console.error("Edge function error:", functionError);
        throw new Error(functionError.message || "Failed to execute dataset");
      }
      
      if (!data.success) {
        throw new Error(data.error || "Execution failed with unknown error");
      }
      
      console.log("Dataset execution successful:", data);
      
      // Extract and set the execution ID
      if (data.executionId) {
        setExecutionId(data.executionId);
        
        toast({
          title: "Dataset Execution Started",
          description: "Dataset execution has been initiated. Results will be available soon.",
        });
        
        return data.executionId;
      } else {
        throw new Error("No execution ID returned from server");
      }
    } catch (e: any) {
      const errorMessage = e?.message || "An unexpected error occurred";
      setError(errorMessage);
      
      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      console.error("Dataset execution error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { 
    run, 
    loading, 
    error, 
    executionId 
  };
}
