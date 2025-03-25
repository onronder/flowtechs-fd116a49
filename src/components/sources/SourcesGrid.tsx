
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import SourceCard from "./SourceCard";

// Define a simpler Source type for the SourcesGrid component
interface GridSource {
  id: string;
  name: string;
  description?: string | null;
  sourceType: string;
  is_active?: boolean;
  created_at?: string | null;
  lastValidatedAt?: string | null;
  apiVersion?: string;
  [key: string]: any; // Allow additional properties
}

export interface SourcesGridProps {
  sources: GridSource[];
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  testingSourceId?: string | null;
}

export default function SourcesGrid({ 
  sources, 
  onTest, 
  onEdit, 
  onDelete, 
  onAddNew,
  testingSourceId 
}: SourcesGridProps) {
  const sortedSources = [...sources].sort((a, b) => {
    // First sort by active status (active first)
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }
    // Then sort by newest created first
    return (new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {sortedSources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          onTest={() => onTest(source.id)}
          onEdit={() => onEdit(source.id)}
          onDelete={() => onDelete(source.id)}
          isTesting={testingSourceId === source.id}
        />
      ))}
      <Card className="bg-card/50 border-border border-dashed shadow-sm flex items-center justify-center hover:bg-card/80 transition-colors cursor-pointer" onClick={onAddNew}>
        <CardContent className="flex flex-col items-center justify-center h-full p-10 text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-3">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-1">Add New Source</h3>
          <p className="text-muted-foreground text-sm">Connect to a new data source</p>
        </CardContent>
      </Card>
    </div>
  );
}
