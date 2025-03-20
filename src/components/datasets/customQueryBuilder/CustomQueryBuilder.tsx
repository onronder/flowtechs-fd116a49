
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchShopifySchema } from "@/api/datasetsApi";
import ResourceSelector from "./ResourceSelector";
import FieldSelectionStep from "./FieldSelectionStep";
import QueryValidationStep from "./QueryValidationStep";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface CustomQueryBuilderProps {
  source: any;
  onSave: (queryData: { query: string; fields: string[]; resourceType: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CustomQueryBuilder({ 
  source, 
  onSave, 
  onCancel, 
  isLoading = false 
}: CustomQueryBuilderProps) {
  const [step, setStep] = useState<'resource' | 'fields' | 'preview'>('resource');
  const [schema, setSchema] = useState<any>(null);
  const [rootTypes, setRootTypes] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [queryResults, setQueryResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  function handleComplete() {
    onSave({
      query: generatedQuery,
      fields: selectedFields,
      resourceType: selectedResource.name
    });
  }

  function handleQueryGenerated(query: string, results: any) {
    setGeneratedQuery(query);
    setQueryResults(results);
    setStep('preview');
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
        <FieldSelectionStep
          sourceId={source.id}
          selectedResource={selectedResource}
          schema={schema}
          selectedFields={selectedFields}
          onFieldsChange={setSelectedFields}
          onQueryGenerated={handleQueryGenerated}
          onBack={() => setStep('resource')}
        />
      )}
      
      {step === 'preview' && (
        <QueryValidationStep 
          sourceId={source.id}
          selectedResource={selectedResource}
          selectedFields={selectedFields}
          generatedQuery={generatedQuery}
          queryResults={queryResults}
          setGeneratedQuery={setGeneratedQuery}
          setQueryResults={setQueryResults}
          onBack={() => setStep('fields')}
          onComplete={handleComplete}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
