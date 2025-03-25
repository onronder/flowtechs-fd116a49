
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { validateCustomQuery } from "@/api/datasets/shopifySchemaApi";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import QueryPreview from "./QueryPreview";
import ResultPreview from "./ResultPreview";

interface QueryValidationStepProps {
  sourceId: string;
  selectedResource: any;
  selectedFields: string[];
  generatedQuery: string;
  queryResults: any;
  setGeneratedQuery: (query: string) => void;
  setQueryResults: (results: any) => void;
  onBack: () => void;
  onComplete: () => void;
  isLoading: boolean;
}

export default function QueryValidationStep({
  sourceId,
  selectedResource,
  selectedFields,
  generatedQuery,
  queryResults,
  setGeneratedQuery,
  setQueryResults,
  onBack,
  onComplete,
  isLoading
}: QueryValidationStepProps) {
  const [revalidating, setRevalidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean;
    message?: string;
    suggestion?: string;
  }>({ valid: true });
  const { toast } = useToast();

  // Function to re-validate the query
  async function revalidateQuery() {
    try {
      setRevalidating(true);
      
      const validationResult = await validateCustomQuery(sourceId, { 
        query: generatedQuery 
      });
      
      if (validationResult.success && validationResult.validation.valid) {
        // Update the results if needed
        if (validationResult.sampleData) {
          setQueryResults(validationResult.sampleData);
        }
        
        setValidationStatus({
          valid: true,
          message: "Query validated successfully"
        });
        
        toast({
          title: "Validation Successful",
          description: "The query is valid and ready to use.",
          variant: "default"
        });
      } else {
        setValidationStatus({
          valid: false,
          message: validationResult.validation.error || "Query validation failed",
          suggestion: validationResult.validation.suggestion
        });
        
        toast({
          title: "Validation Failed",
          description: validationResult.validation.error || "The query is invalid",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error revalidating query:", error);
      setValidationStatus({
        valid: false,
        message: "Error occurred during validation"
      });
      
      toast({
        title: "Validation Error",
        description: "Failed to validate the query. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRevalidating(false);
    }
  }
  
  // Calculate how many records are in the sample data
  const recordCount = queryResults && queryResults.edges 
    ? queryResults.edges.length 
    : 0;

  return (
    <>
      {/* Validation status alerts */}
      {!validationStatus.valid && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Issue</AlertTitle>
          <AlertDescription>
            {validationStatus.message}
            {validationStatus.suggestion && (
              <p className="mt-2 text-sm font-medium">{validationStatus.suggestion}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">GraphQL Query</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={revalidateQuery}
              disabled={revalidating}
              className="h-7 px-2"
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1" />
              {revalidating ? "Validating..." : "Revalidate"}
            </Button>
          </div>
          <QueryPreview query={generatedQuery} />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Sample Results</h4>
            <span className="text-xs text-muted-foreground">
              {recordCount} record{recordCount !== 1 ? "s" : ""}
            </span>
          </div>
          <ResultPreview data={queryResults} resourceType={selectedResource?.name} />
        </div>
      </div>
      
      {/* Dataset creation info */}
      <Alert variant="default" className="mt-4 mb-2 bg-muted/50">
        <Info className="h-4 w-4" />
        <AlertTitle>Ready to Create Dataset</AlertTitle>
        <AlertDescription>
          This dataset will query {selectedResource?.name} with {selectedFields.length} selected field{selectedFields.length !== 1 ? "s" : ""}.
        </AlertDescription>
      </Alert>
      
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Modify Query
        </Button>
        <Button 
          onClick={onComplete} 
          disabled={isLoading || !validationStatus.valid}
        >
          {isLoading ? "Creating..." : "Create Dataset"}
        </Button>
      </div>
    </>
  );
}
