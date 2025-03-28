import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { executeDataset } from "@/api/datasets/execution/executeDatasetApi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DatasetRunButtonProps {
  datasetId: string;
  isRunning: boolean;
  onExecutionStarted: (executionId: string) => void;
  onRefresh: () => void;
}

export default function DatasetRunButton({
  datasetId,
  isRunning,
  onExecutionStarted,
  onRefresh
}: DatasetRunButtonProps) {
  const { toast } = useToast();
  const [localIsRunning, setLocalIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [datasetType, setDatasetType] = useState<string | null>(null);
  const [edgeFunction, setEdgeFunction] = useState<string | null>(null);

  // Get dataset type on mount
  useEffect(() => {
    async function fetchDatasetDetails() {
      try {
        const { data, error } = await supabase
          .from("user_datasets")
          .select("dataset_type, parameters")
          .eq("id", datasetId)
          .single();
          
        if (error) throw error;
        
        setDatasetType(data.dataset_type);
        
        // Extract edge function name if it's a direct_api dataset
        if (data.dataset_type === "direct_api" && data.parameters) {
          // Safe access to parameters with proper type checking
          const params = data.parameters;
          // Check if params is an object and contains edge_function
          if (typeof params === 'object' && params !== null && 'edge_function' in params) {
            setEdgeFunction(params.edge_function as string);
          }
        }
      } catch (error) {
        console.error("Error fetching dataset details:", error);
      }
    }
    
    fetchDatasetDetails();
  }, [datasetId]);

  // Use the most restrictive state - either parent or local
  const buttonDisabled = isRunning || localIsRunning;

  // For debugging
  useEffect(() => {
    console.log(`DatasetRunButton rendered for dataset: ${datasetId}, isRunning: ${isRunning}, localIsRunning: ${localIsRunning}, type: ${datasetType}`);
    
    // If the button was previously running but parent state has reset, clear local state too
    if (localIsRunning && !isRunning && retryCount === 0) {
      console.log(`Resetting local running state to match parent state for dataset: ${datasetId}`);
      setLocalIsRunning(false);
    }
  }, [datasetId, isRunning, localIsRunning, retryCount, datasetType]);

  // Handle direct API dataset execution (new flow)
  const handleDirectApiExecution = async () => {
    try {
      console.log(`Executing direct API dataset with edge function: ${edgeFunction}`);
      
      // Get the Shopify source for credentials
      const { data: dataset, error: datasetError } = await supabase
        .from("user_datasets")
        .select("source_id")
        .eq("id", datasetId)
        .single();
        
      if (datasetError) throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
      
      const { data: source, error: sourceError } = await supabase
        .from("sources")
        .select("config")
        .eq("id", dataset.source_id)
        .single();
        
      if (sourceError) throw new Error(`Failed to fetch source: ${sourceError.message}`);
      
      // Create an execution record
      const { data: execution, error: executionError } = await supabase
        .from("dataset_executions")
        .insert({
          dataset_id: datasetId,
          user_id: (await supabase.auth.getUser()).data.user!.id,
          status: "pending"
        })
        .select()
        .single();
        
      if (executionError) throw new Error(`Failed to create execution: ${executionError.message}`);
        
      // Call the appropriate edge function directly
      if (!edgeFunction) throw new Error("Edge function name not found in dataset parameters");
      
      // Invoke the edge function
      const { error: invokeError } = await supabase.functions.invoke(
        edgeFunction,
        {
          body: {
            credentials: source.config,
            executionId: execution.id
          }
        }
      );
      
      if (invokeError) throw new Error(`Edge function error: ${invokeError.message}`);
      
      // Call the onExecutionStarted callback
      onExecutionStarted(execution.id);
      
      // Show success toast
      toast({
        title: "Dataset Execution Started",
        description: "Dataset execution has been initiated. Results will be available in preview when complete.",
      });
      
      // Refresh the list to update last execution time
      onRefresh();
      
      return true;
    } catch (error) {
      console.error("Error executing direct API dataset:", error);
      throw error;
    }
  };

  const handleRunDataset = useCallback(async () => {
    try {
      console.log("RUN BUTTON CLICKED - handleRunDataset called");
      
      // Reset error state
      setError(null);
      
      // Validate dataset ID
      if (!datasetId) {
        console.error("Invalid dataset ID:", datasetId);
        throw new Error("Invalid dataset ID");
      }
      
      // Set local running state to true
      setLocalIsRunning(true);
      console.log("Starting dataset execution with dataset ID:", datasetId);
      
      // Track retry attempt
      const currentRetry = retryCount;
      if (currentRetry > 0) {
        console.log(`Retry attempt ${currentRetry} for dataset ID: ${datasetId}`);
      }
      
      // Check if this is a direct_api dataset
      if (datasetType === "direct_api" && edgeFunction) {
        console.log("Using direct API execution flow");
        await handleDirectApiExecution();
      } else {
        // Use the standard execution flow for other dataset types
        console.log("Using standard dataset execution flow");
        console.log("Calling executeDataset API with ID:", datasetId);
        
        try {
          // This is the key API call that triggers the execution
          console.log("BEFORE executeDataset call");
          const result = await executeDataset(datasetId);
          console.log("AFTER executeDataset call - result:", result);
          
          // Validate the result
          if (!result) {
            throw new Error("No response received from execution API");
          }
          
          if (!result.executionId) {
            console.error("Invalid execution result format:", result);
            throw new Error("Invalid response from execution function - missing executionId");
          }
          
          // Reset retry count on success
          if (currentRetry > 0) {
            setRetryCount(0);
          }
          
          // Call the parent callback with the execution ID
          console.log("Execution started successfully, execution ID:", result.executionId);
          onExecutionStarted(result.executionId);
          
          toast({
            title: "Dataset Execution Started",
            description: "Dataset execution has been initiated. Results will be available in preview when complete.",
          });
          
          // Refresh the list to update last execution time
          onRefresh();
        } catch (executeError) {
          console.error("Error during executeDataset:", executeError);
          throw executeError;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to execute the dataset";
      setError(errorMessage);
      console.error("Error executing dataset:", error);
      
      // Increment retry count for tracking purposes
      setRetryCount(prev => prev + 1);
      
      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      // Always make sure to reset the loading state
      console.log("Resetting local running state for dataset:", datasetId);
      setLocalIsRunning(false);
    }
  }, [datasetId, onExecutionStarted, onRefresh, toast, retryCount, datasetType, edgeFunction]);

  return (
    <div>
      <Button 
        variant="default" 
        size="sm"
        onClick={handleRunDataset}
        disabled={buttonDisabled}
      >
        {buttonDisabled ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-1" />
            {retryCount > 0 ? "Retry Run" : "Run"}
          </>
        )}
      </Button>
      {error && (
        <div className="text-red-500 text-xs mt-1 max-w-[200px] break-words">
          {error}
        </div>
      )}
    </div>
  );
}
