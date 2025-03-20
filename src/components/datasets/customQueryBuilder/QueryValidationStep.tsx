
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { validateCustomQuery } from "@/api/datasetsApi";
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
  return (
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
        <Button type="button" variant="outline" onClick={onBack}>
          Modify Query
        </Button>
        <Button onClick={onComplete} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Dataset"}
        </Button>
      </div>
    </>
  );
}
