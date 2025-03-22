
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function PreviewLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <LoadingSpinner size="lg" />
      <div className="ml-4 flex flex-col">
        <div className="font-medium">Loading dataset results...</div>
        <div className="text-sm text-muted-foreground">This may take a moment depending on the dataset size</div>
      </div>
    </div>
  );
}
