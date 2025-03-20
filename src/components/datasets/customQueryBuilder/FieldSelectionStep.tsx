
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { validateCustomQuery } from "@/api/datasetsApi";
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
  const { toast } = useToast();

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
      
      // Generate the GraphQL query
      const query = generateGraphQLQuery(selectedResource, selectedFields);
      
      // Validate the query with the backend
      const validationResult = await validateCustomQuery(sourceId, { query });
      
      if (validationResult.valid) {
        onQueryGenerated(query, validationResult.results || { edges: [] });
      } else {
        toast({
          title: "Query Error",
          description: validationResult.error || "The generated query is invalid.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error validating query:", error);
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
      <FieldSelector 
        resource={selectedResource}
        schema={schema}
        selectedFields={selectedFields}
        onFieldsChange={onFieldsChange}
      />
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back to Resources
        </Button>
        <Button 
          onClick={generateAndValidateQuery}
          disabled={validating || selectedFields.length === 0}
        >
          {validating ? "Validating..." : "Preview Query"}
        </Button>
      </div>
    </>
  );
}
