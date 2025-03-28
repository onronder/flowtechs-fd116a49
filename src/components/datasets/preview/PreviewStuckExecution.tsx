
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { resetSpecificExecution } from "@/api/datasets/execution/executionResetApi";
import { useToast } from "@/hooks/use-toast";

interface PreviewStuckExecutionProps {
  executionId: string;
  startTime?: string; // Add startTime as an optional prop
  onReset: () => void;
}

export default function PreviewStuckExecution({
  executionId,
  startTime,
  onReset
}: PreviewStuckExecutionProps) {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = React.useState(false);

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetSpecificExecution(executionId);
      toast({
        title: "Execution Reset",
        description: "The execution has been reset. You can now run it again.",
      });
      onReset();
    } catch (error) {
      console.error("Error resetting execution:", error);
      toast({
        title: "Error",
        description: "Failed to reset the execution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Format the execution start time if provided
  const formattedStartTime = startTime 
    ? new Date(startTime).toLocaleString() 
    : "Unknown";

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
      <h3 className="text-lg font-medium mb-2">Execution Appears to be Stuck</h3>
      <p className="text-muted-foreground mb-2">
        This execution has been running for an extended period and may be stuck.
        You can reset it to try running the dataset again.
      </p>
      {startTime && (
        <p className="text-sm text-muted-foreground mb-6">
          Started at: {formattedStartTime}
        </p>
      )}
      <Button 
        onClick={handleReset} 
        disabled={isResetting}
      >
        {isResetting ? "Resetting..." : "Reset Execution"}
      </Button>
    </div>
  );
}
