
interface ResultPreviewProps {
  data: any;
  resourceType?: string;
}

export default function ResultPreview({ data, resourceType }: ResultPreviewProps) {
  return (
    <div className="border rounded-lg p-4 overflow-auto max-h-56">
      {data ? (
        <pre className="text-xs font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="text-muted-foreground text-center">No sample data available.</p>
      )}
    </div>
  );
}
