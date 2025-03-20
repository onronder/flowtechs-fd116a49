
interface QueryPreviewProps {
  query: string;
}

export default function QueryPreview({ query }: QueryPreviewProps) {
  return (
    <div className="border rounded-lg p-4">
      <pre className="text-xs overflow-auto">
        {query || "No query available."}
      </pre>
    </div>
  );
}
