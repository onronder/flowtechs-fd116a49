
import React from "react";
import SourceCard from "./SourceCard";

interface Source {
  id: string;
  name: string;
  description?: string | null;
  sourceType: string;
  lastValidatedAt?: string | null;
  apiVersion?: string;
}

export interface SourcesGridProps {
  sources: Source[];
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  testingSourceId: string | null;
}

export default function SourcesGrid({
  sources,
  onTest,
  onEdit,
  onDelete,
  testingSourceId
}: SourcesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          onTest={() => onTest(source.id)}
          onEdit={() => onEdit(source.id)}
          onDelete={() => onDelete(source.id)}
          isTesting={testingSourceId === source.id}
        />
      ))}
    </div>
  );
}
