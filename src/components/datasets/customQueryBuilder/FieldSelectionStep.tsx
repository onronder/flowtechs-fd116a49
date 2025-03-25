
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { validateCustomQuery } from "@/api/datasets/shopifySchemaApi";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import FieldSelector from "./FieldSelector";
import { generateGraphQLQuery } from "./queryGenerationUtils";

interface FieldSelectionStepProps {
  sourceId: string;
  selectedResource: any;
  schema: any;
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  onQueryGenerated: (query: string, results: any) => void;
  onBack: () => void;
}

export default function FieldSelectionStep({
  sourceId,
  selectedResource,
  schema,
  selectedFields,
  onFieldsChange,
  onQueryGenerated,
  onBack
}: FieldSelectionStepProps) {
  const [validating, setValidating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<any[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Generate and validate the GraphQL query using the selected fields
   */
  async function generateAndValidateQuery() {
    if (!selectedResource || selectedFields.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one field.",
        variant: "destructive"
      });
      return;
    }

    try {
      setValidating(true);
      // Clear previous validation state
      setFieldErrors([]);
      setValidationError(null);
      setSuggestion(null);
      
      // Validate the query with the backend using the resource and fields
      const validationResult = await validateCustomQuery(sourceId, { 
        resourceType: selectedResource.name,
        fields: selectedFields 
      });
      
      // Check if validation succeeded
      if (validationResult.success && validationResult.validation.valid) {
        // Validation successful, proceed to next step
        onQueryGenerated(
          validationResult.query, 
          validationResult.sampleData || { edges: [] }
        );
      } else {
        // Validation failed, show errors
        if (validationResult.validation.fieldErrors && validationResult.fieldValidation) {
          // Show invalid fields
          setFieldErrors(validationResult.fieldValidation.filter(f => !f.valid));
        }
        
        // Set the overall validation error message
        setValidationError(validationResult.validation.error || "The query is invalid.");
        
        // Set suggestion if available
        setSuggestion(validationResult.validation.suggestion || null);
        
        // Show a toast with the error
        toast({
          title: "Query Validation Failed",
          description: validationResult.validation.error || "The query is invalid.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error validating query:", error);
      setValidationError("Failed to validate the query. Please try again.");
      
      toast({
        title: "Error",
        description: "Failed to validate the query. Please try again.",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  }

  return (
    <>
      {/* Field validation errors, if any */}
      {fieldErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid Fields</AlertTitle>
          <AlertDescription>
            <p>The following fields are invalid:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {fieldErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  <strong>{error.field}</strong>: {error.error} 
                  {error.suggestedFix && (
                    <span className="ml-1 text-xs font-medium">
                      ({error.suggestedFix})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Overall validation error */}
      {validationError && !fieldErrors.length && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>
            {validationError}
            {suggestion && (
              <p className="mt-2 text-sm font-medium">{suggestion}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Selector for fields */}
      <FieldSelector 
        resource={selectedResource}
        schema={schema}
        selectedFields={selectedFields}
        onFieldsChange={(fields) => {
          // Clear errors when fields change
          setFieldErrors([]);
          setValidationError(null);
          setSuggestion(null);
          onFieldsChange(fields);
        }}
      />

      {/* Selection summary */}
      {selectedFields.length > 0 && (
        <Alert variant="default" className="mt-4 mb-2 bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertTitle>Selected {selectedFields.length} field(s)</AlertTitle>
          <AlertDescription>
            Click "Preview Query" to validate and continue.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to Resources
        </Button>
        <Button 
          onClick={generateAndValidateQuery}
          disabled={validating || selectedFields.length === 0}
          variant={fieldErrors.length ? "outline" : "default"}
        >
          {validating ? "Validating..." : "Preview Query"}
        </Button>
      </div>
    </>
  );
}
