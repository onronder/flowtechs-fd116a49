
interface ResultPreviewProps {
  data: any;
  resourceType?: string;
}

export default function ResultPreview({ data, resourceType }: ResultPreviewProps) {
  if (!data || (data.edges && data.edges.length === 0)) {
    return (
      <div className="border rounded-lg p-4 text-center text-muted-foreground">
        No sample data available.
      </div>
    );
  }

  // For GraphQL responses with edges/nodes structure
  if (data.edges) {
    // Extract nodes from edges
    const nodes = data.edges.map((edge: any) => edge.node);
    
    // Just show the first node as a preview
    const previewNode = nodes[0] || {};

    return (
      <div className="border rounded-lg p-4 overflow-auto max-h-56">
        <pre className="text-xs font-mono">
          {JSON.stringify(previewNode, null, 2)}
        </pre>
        <div className="border-t mt-2 pt-2 text-xs text-muted-foreground">
          Showing 1 of {nodes.length} {resourceType || 'item'}{nodes.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  // For direct data objects
  return (
    <div className="border rounded-lg p-4 overflow-auto max-h-56">
      <pre className="text-xs font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
