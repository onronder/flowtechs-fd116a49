
import SourceCard from "./SourceCard";
import { PlusCircle } from "lucide-react";
import { Source } from "@/hooks/useSources";

interface SourcesGridProps {
  sources: Source[];
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export default function SourcesGrid({ sources, onTest, onEdit, onDelete, onAddNew }: SourcesGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {sources.map(source => (
        <SourceCard 
          key={source.id}
          source={source}
          onEdit={onEdit}
          onDelete={onDelete}
          onTest={onTest}
        />
      ))}
      
      {/* Add Source Card */}
      <button 
        onClick={onAddNew}
        className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors h-full min-h-[220px]"
      >
        <PlusCircle className="h-12 w-12 text-muted-foreground/70 mb-4" />
        <span className="text-lg font-medium text-muted-foreground/70">Add New Source</span>
      </button>
    </div>
  );
}
