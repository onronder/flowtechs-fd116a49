// src/api/datasetsApi.ts
import { supabase } from "@/integrations/supabase/client";

// Fetch user datasets
export async function fetchUserDatasets() {
  const { data, error } = await supabase
    .from("user_datasets")
    .select(`
      *,
      source:source_id(*),
      template:template_id(*),
      last_execution:dataset_executions(
        id,
        status,
        start_time,
        end_time,
        row_count,
        execution_time_ms
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  // Process the data to add some computed properties
  return data.map(dataset => ({
    ...dataset,
    last_execution_id: dataset.last_execution?.[0]?.id,
    last_execution_time: dataset.last_execution?.[0]?.end_time,
    last_row_count: dataset.last_execution?.[0]?.row_count
  }));
}

// Fetch predefined query templates
export async function fetchPredefinedTemplates() {
  const { data, error } = await supabase
    .from("query_templates")
    .select("*")
    .eq("type", "predefined")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data;
}

// Fetch dependent query templates
export async function fetchDependentTemplates() {
  const { data, error } = await supabase
    .from("dependent_query_templates")
    .select("*")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data;
}

// Create a predefined dataset
export async function createPredefinedDataset(datasetData) {
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: datasetData.name,
      description: datasetData.description,
      source_id: datasetData.sourceId,
      dataset_type: "predefined",
      template_id: datasetData.templateId
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Create a dependent dataset
export async function createDependentDataset(datasetData) {
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: datasetData.name,
      description: datasetData.description,
      source_id: datasetData.sourceId,
      dataset_type: "dependent",
      template_id: datasetData.templateId
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Create a custom dataset
export async function createCustomDataset(datasetData) {
  const { data, error } = await supabase
    .from("user_datasets")
    .insert({
      name: datasetData.name,
      description: datasetData.description,
      source_id: datasetData.sourceId,
      dataset_type: "custom",
      custom_query: datasetData.query,
      custom_fields: datasetData.selectedFields,
      parameters: {
        resourceType: datasetData.resourceType
      }
    })
    .select();

  if (error) throw error;
  return data[0];
}

// Execute dataset
export async function executeDataset(datasetId) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Execute",
    { body: { datasetId } }
  );

  if (error) throw error;
  return data;
}

// Fetch dataset preview
export async function fetchDatasetPreview(executionId) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Preview",
    { body: { executionId } }
  );

  if (error) throw error;
  return data;
}

// Export dataset
export async function exportDataset(executionId, format = 'json', saveToStorage = false) {
  const { data, error } = await supabase.functions.invoke(
    "Dataset_Export",
    {
      body: { executionId, format },
      headers: { 'Save-To-Storage': saveToStorage ? 'true' : 'false' }
    }
  );

  if (error) throw error;
  return data;
}

// Delete dataset
export async function deleteDataset(datasetId) {
  const { error } = await supabase
    .from("user_datasets")
    .delete()
    .eq("id", datasetId);

  if (error) throw error;
  return true;
}

// Fetch Shopify GraphQL schema for custom queries
export async function fetchShopifySchema(sourceId) {
  const { data, error } = await supabase.functions.invoke(
    "Cust_FetchSchema",
    { body: { sourceId } }
  );

  if (error) throw error;
  return data;
}

// Validate custom query
export async function validateCustomQuery(sourceId, queryData) {
  const { data, error } = await supabase.functions.invoke(
    "Cust_ValidateQuery",
    { body: { sourceId, ...queryData } }
  );

  if (error) throw error;
  return data;
}

### 2. Connect DatasetCard Component to API

Update your DatasetCard component to use the API functions:

```tsx
// src/components/datasets/DatasetCard.tsx
import { useState } from "react";
import { formatDistance } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Play, Download, Edit, Trash, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { executeDataset, deleteDataset } from "@/api/datasetsApi";
import DatasetPreviewModal from "./DatasetPreviewModal";

// Helper function to get type-specific styles
function getDatasetTypeStyles(type: string) {
  switch (type) {
    case 'predefined':
      return { color: 'text-blue-500', label: 'Predefined' };
    case 'dependent':
      return { color: 'text-purple-500', label: 'Dependent' };
    case 'custom':
      return { color: 'text-amber-500', label: 'Custom' };
    default:
      return { color: 'text-gray-500', label: 'Dataset' };
  }
}

export default function DatasetCard({ dataset, onRefresh }) {
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const { toast } = useToast();
  const typeStyles = getDatasetTypeStyles(dataset.dataset_type || 'custom');

  async function handleRunDataset() {
    try {
      setIsRunning(true);
      const result = await executeDataset(dataset.id);
      setExecutionId(result.executionId);
      setShowPreview(true);
      toast({
        title: "Dataset Execution Started",
        description: "The dataset is now being processed. You'll see results soon.",
      });
      // Refresh the list after a delay to update last execution time
      setTimeout(() => onRefresh(), 2000);
    } catch (error) {
      console.error("Error executing dataset:", error);
      toast({
        title: "Error",
        description: "Failed to execute the dataset. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleDeleteDataset() {
    if (confirm(`Are you sure you want to delete "${dataset.name}"? This action cannot be undone.`)) {
      try {
        await deleteDataset(dataset.id);
        toast({
          title: "Dataset Deleted",
          description: "The dataset has been deleted successfully.",
        });
        onRefresh();
      } catch (error) {
        console.error("Error deleting dataset:", error);
        toast({
          title: "Error",
          description: "Failed to delete the dataset. Please try again.",
          variant: "destructive"
        });
      }
    }
  }

  function handleViewPreview() {
    if (dataset.last_execution_id) {
      setExecutionId(dataset.last_execution_id);
      setShowPreview(true);
    } else {
      toast({
        title: "No Data Available",
        description: "This dataset has not been executed yet. Run it first to see results.",
        variant: "destructive"
      });
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium">{dataset.name}</h3>
            {dataset.description && (
              <p className="text-sm text-muted-foreground mt-1">{dataset.description}</p>
            )}
          </div>
          <Badge variant="outline" className={typeStyles.color}>{typeStyles.label}</Badge>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Source:</span>
            <span className="font-medium">{dataset.source?.name || "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Run:</span>
            <span>
              {dataset.last_execution_time ? 
                formatDistance(new Date(dataset.last_execution_time), new Date(), { addSuffix: true }) : 
                "Never"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Row Count:</span>
            <span>{dataset.last_row_count || 0}</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewPreview}
            disabled={!dataset.last_execution_id}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <div className="flex space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleRunDataset}
              disabled={isRunning}
            >
              <Play className="h-4 w-4 mr-1" />
              {isRunning ? "Running..." : "Run"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewPreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Results
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteDataset} className="text-red-600">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {showPreview && executionId && (
        <DatasetPreviewModal
          executionId={executionId}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Card>
  );
}