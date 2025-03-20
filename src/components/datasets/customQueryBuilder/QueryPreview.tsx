
import { useEffect, useRef } from "react";

interface QueryPreviewProps {
  query: string;
}

export default function QueryPreview({ query }: QueryPreviewProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    // Apply basic syntax highlighting if desired
    // For a real implementation, consider using a library like prism.js or highlight.js
  }, [query]);

  return (
    <div className="border rounded-md bg-muted/50 overflow-hidden">
      <pre 
        ref={preRef}
        className="p-4 text-xs font-mono overflow-auto max-h-56"
      >
        {query || "No query available."}
      </pre>
    </div>
  );
}
