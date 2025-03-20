
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResourceSelector from "./ResourceSelector";
import FieldSelector from "./FieldSelector";
import QueryPreview from "./QueryPreview";
import ResultPreview from "./ResultPreview";
import { fetchShopifySchema, validateCustomQuery } from "@/api/datasetsApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CustomQueryBuilderProps {
  source: any;
  onSave: (data: {
    query: string;
    resourceType: string;
    selectedFields: string[];
  }) => void;
  onBack: () => void;
}

export default function CustomQueryBuilder({
  source,
  onSave,
  onBack
}: CustomQueryBuilderProps) {
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [validatedQuery, setValidatedQuery] = useState<string>("");
  const [queryValidation, setQueryValidation] = useState<any>(null);
  const [sampleData, setSampleData] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("fields");
  
  const { toast } = useToast();

  // Load schema when component mounts
  useEffect(() => {
    const loadSchema = async () => {
      try {
        setLoading(true);
        const result = await fetchShopifySchema(source.id);
        setSchema(result.schema);
      } catch (error) {
        console.error("Error loading schema:", error);
        toast({
          title: "Error",
          description: "Failed to load GraphQL schema. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, [source.id, toast]);

  const handleResourceSelect = (resource: any) => {
    setSelectedResource(resource);
    setSelectedFields([]);
    setValidatedQuery("");
    setQueryValidation(null);
    setSampleData(null);
  };

  const handleFieldsChange = (fields: string[]) => {
    setSelectedFields(fields);
  };

  const handleValidateQuery = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one field to include in your query.",
        variant: "destructive"
      });
      return;
    }

    try {
      setValidating(true);
      const result = await validateCustomQuery(source.id, {
        resourceType: selectedResource.name,
        fields: selectedFields
      });

      if (result.success) {
        setValidatedQuery(result.query);
        setQueryValidation(result.validation);
        setSampleData(result.sampleData);
        setActiveTab("preview");
        
        toast({
          title: "Query Valid",
          description: "Your query has been validated successfully.",
        });
      } else {
        setQueryValidation(result.validation);
        toast({
          title: "Query Invalid",
          description: result.validation.error || "The query is invalid.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error validating query:", error);
      toast({
        title: "Validation Error",
        description: "An error occurred while validating your query.",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = () => {
    if (!validatedQuery || !queryValidation?.valid) {
      toast({
        title: "Validation Required",
        description: "Please validate your query before saving.",
        variant: "destructive"
      });
      return;
    }

    onSave({
      query: validatedQuery,
      resourceType: selectedResource.name,
      selectedFields
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading GraphQL schema...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!selectedResource ? (
        <ResourceSelector
          resources={schema.rootResources}
          onSelect={handleResourceSelect}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Building query for: <span className="text-primary">{selectedResource.name}</span>
            </h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedResource(null)}>
              Change Resource
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fields">Select Fields</TabsTrigger>
              <TabsTrigger value="preview" disabled={!validatedQuery}>
                Preview Query
              </TabsTrigger>
            </TabsList>
            <TabsContent value="fields" className="space-y-4 pt-4">
              <FieldSelector
                resource={selectedResource}
                schema={schema}
                selectedFields={selectedFields}
                onFieldsChange={handleFieldsChange}
              />
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
                <div className="space-x-2">
                  <Button 
                    variant="secondary" 
                    onClick={handleValidateQuery}
                    disabled={validating || selectedFields.length === 0}
                  >
                    {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Validate Query
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={!validatedQuery || !queryValidation?.valid}
                  >
                    Create Dataset
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Generated GraphQL Query</h4>
                  <QueryPreview query={validatedQuery} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Sample Result</h4>
                  <ResultPreview data={sampleData} resourceType={selectedResource.name} />
                </div>
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setActiveTab("fields")}>
                  Back to Fields
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={!validatedQuery || !queryValidation?.valid}
                >
                  Create Dataset
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
