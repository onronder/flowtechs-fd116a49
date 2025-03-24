
import { useState, useCallback } from "react";
import { PreviewData } from "./previewTypes";
import { useToast } from "@/hooks/use-toast";

export function usePreviewExecutionState() {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Handle successful execution data updates
  const handleExecutionUpdate = useCallback((data: PreviewData) => {
    setPreviewData(data);
    setLoading(false);
    
    // Only show toast for failures, not for completions in the preview modal
    if (data.status === "failed") {
      toast({
        title: "Execution Failed",
        description: data.error || "The dataset execution failed",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Handle error during data loading
  const handleExecutionError = useCallback((errorMessage: string, isPermanent: boolean = false) => {
    setError(errorMessage);
    setLoading(false);
    
    if (isPermanent) {
      // Show authentication error toast
      if (errorMessage.includes("Authentication required")) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to view dataset preview",
          variant: "destructive"
        });
      }
    }
  }, [toast]);
  
  // Reset state for a new preview
  const resetExecutionState = useCallback(() => {
    setLoading(true);
    setError(null);
    // Don't reset previewData here to avoid flickering
  }, []);
  
  return {
    previewData,
    setPreviewData,
    loading,
    setLoading,
    error,
    setError,
    handleExecutionUpdate,
    handleExecutionError,
    resetExecutionState
  };
}
