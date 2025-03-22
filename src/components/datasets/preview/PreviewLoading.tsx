
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function PreviewLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <LoadingSpinner size="lg" />
      <div className="ml-4">Loading dataset results...</div>
    </div>
  );
}
