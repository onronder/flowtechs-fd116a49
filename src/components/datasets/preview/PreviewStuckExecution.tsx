
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { resetSpecificExecution } from "@/api/datasets/execution/executionResetApi";
import { useToast } from "@/hooks/use-toast";

interface PreviewStuckExecutionProps {
  executionId: string;
  startTime: string;
  onRetry: () => void;
}

export default function PreviewStuckExecution({
  executionId,
  startTime,
  onRetry
}: PreviewStuckExecutionProps) {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  
  // Calculate how long ago the execution started
  const getTimeAgo = () => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - start) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };
  
  const handleReset = async () => {
    try {
      setIsResetting(true);
      
      const result = await resetSpecificExecution(executionId);
      
      toast({
        title: result.success ? "Execution Reset" : "Reset Not Required",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
      
      if (result.success) {
        // After successfully resetting, try loading the preview again
        setTimeout(() => {
          onRetry();
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset execution",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md">
        <div className="flex items-center justify-center mb-4 text-amber-600">
          <AlertTriangle size={32} />
        </div>
        
        <h3 className="text-lg font-medium text-amber-800 mb-2">
          Execution Appears Stuck
        </h3>
        
        <p className="text-amber-700 mb-4">
          This dataset execution has been in "pending" state for {getTimeAgo()} (started at {new Date(startTime).toLocaleTimeString()}).
          It may have encountered an issue.
        </p>
        
        <div className="flex justify-center space-x-3 mt-4">
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-amber-300 hover:bg-amber-50 text-amber-700"
          >
            Check Again
          </Button>
          
          <Button 
            onClick={handleReset}
            disabled={isResetting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isResetting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Execution"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
