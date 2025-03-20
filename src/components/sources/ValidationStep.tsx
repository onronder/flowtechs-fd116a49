
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { saveSource, SourceData } from "@/utils/sourceSaveUtils";
import SourceInfoDisplay from "./SourceInfoDisplay";
import SourceValidationDetails from "./SourceValidationDetails";

interface ValidationStepProps {
  sourceData: SourceData;
  onBack: () => void;
  existingId?: string;
}

export default function ValidationStep({ sourceData, onBack, existingId }: ValidationStepProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const result = await saveSource(sourceData, existingId, toast);
      
      if (result.success) {
        toast({
          title: existingId ? "Source updated" : "Source created",
          description: existingId 
            ? "Your source has been updated successfully."
            : "Your source has been created successfully.",
        });
        
        navigate("/sources");
      }
    } catch (error) {
      console.error("Error saving source:", error);
      toast({
        title: "Error",
        description: `Failed to ${existingId ? 'update' : 'create'} the source. Please try again. Error: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
        <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">
          Connection Successful!
        </h3>
        <p className="text-sm text-muted-foreground">
          Your source has been validated successfully.
        </p>
      </div>

      <div className="space-y-4">
        <SourceInfoDisplay
          sourceType={sourceData.type}
          name={sourceData.name}
          description={sourceData.description}
        />

        <SourceValidationDetails
          sourceType={sourceData.type}
          validationResult={sourceData.validationResult}
          credentials={sourceData.credentials}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {existingId ? "Updating..." : "Creating..."}
            </>
          ) : (
            existingId ? "Update Source" : "Create Source"
          )}
        </Button>
      </div>
    </div>
  );
}
