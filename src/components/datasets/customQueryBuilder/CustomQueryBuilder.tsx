
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchShopifySchema, validateCustomQuery } from "@/api/datasetsApi";
import { ChevronLeft, Loader2 } from "lucide-react";
import ResourceSelector from "./ResourceSelector";
import FieldSelector from "./FieldSelector";
import QueryPreview from "./QueryPreview";
import ResultPreview from "./ResultPreview";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface CustomQueryBuilderProps {
  source: any;
  onSave: (queryData: { query: string; fields: string[]; resourceType: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CustomQueryBuilder({ source, onSave, onCancel, isLoading = false }: CustomQueryBuilderProps) {
  const [step, setStep] = useState<'resource' | 'fields' | 'preview'>('resource');
  const [schema, setSchema] = useState<any>(null);
  const [rootTypes, setRootTypes] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [queryResults, setQueryResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchema();
  }, [source.id]);

  async function fetchSchema() {
    try {
      setLoading(true);
      const data = await fetchShopifySchema(source.id);
      
      setSchema(data);
      
      // Extract root types (those that can be directly queried)
      const roots = data.types?.filter((type: any) => 
        type.name.endsWith('Connection') || 
        ['Product', 'Order', 'Customer', 'Collection'].includes(type.name)
      ) || [];
      
      setRootTypes(roots);
    } catch (error) {
      console.error("Error fetching schema:", error);
      toast({
        title: "Error",
        description: "Failed to load Shopify schema. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

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
      
      // Generate a GraphQL query based on selected fields
      // This is a simplified version - a real implementation would be more robust
      const resourceName = selectedResource.name.endsWith('Connection') 
        ? selectedResource.name.replace('Connection', 's').toLowerCase() 
        : `${selectedResource.name.toLowerCase()}s`;
        
      const fieldSelections = selectedFields.map(field => {
        // Handle nested fields (dot notation in our selection)
        if (field.includes('.')) {
          const parts = field.split('.');
          let result = parts[parts.length - 1];
          
          // Work backwards to create nested selection
          for (let i = parts.length - 2; i >= 0; i--) {
            result = `${parts[i]} { ${result} }`;
          }
          return result;
        }
        return field;
      }).join('\n      ');

      const query = `query {
  ${resourceName}(first: 10) {
    edges {
      node {
        ${fieldSelections}
      }
    }
  }
}`;

      setGeneratedQuery(query);
      
      // Validate the query with the backend
      const validationResult = await validateCustomQuery(source.id, { query });
      
      if (validationResult.valid) {
        setQueryResults(validationResult.results || { edges: [] });
        setStep('preview');
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

  function handleComplete() {
    onSave({
      query: generatedQuery,
      fields: selectedFields,
      resourceType: selectedResource.name
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3">Loading schema...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === 'resource' && (
        <>
          <ResourceSelector 
            resources={rootTypes} 
            onSelect={(resource) => {
              setSelectedResource(resource);
              setStep('fields');
            }} 
          />
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Back
            </Button>
          </div>
        </>
      )}
      
      {step === 'fields' && selectedResource && (
        <>
          <FieldSelector 
            resource={selectedResource}
            schema={schema}
            selectedFields={selectedFields}
            onFieldsChange={setSelectedFields}
          />
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setStep('resource')}>
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
      )}
      
      {step === 'preview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Generated Query</h4>
              <QueryPreview query={generatedQuery} />
            </div>
            <div>
              <h4 className="font-medium mb-2">Sample Results</h4>
              <ResultPreview data={queryResults} resourceType={selectedResource?.name} />
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setStep('fields')}>
              Modify Query
            </Button>
            <Button onClick={handleComplete} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Dataset"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
