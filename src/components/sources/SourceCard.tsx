import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayIcon, Pencil, Trash2, Loader } from "lucide-react";
import { Source } from "@/hooks/useSources";

interface SourceCardProps {
  source: Source;
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isTesting?: boolean;
}

export default function SourceCard({ 
  source, 
  onTest, 
  onEdit, 
  onDelete,
  isTesting = false
}: SourceCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-cardBg">
      <CardHeader>
        <CardTitle>{source.name}</CardTitle>
        <CardDescription>{source.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Type:</strong> {source.source_type}
          </p>
          <p>
            <strong>Created:</strong> {new Date(source.created_at || '').toLocaleDateString()}
          </p>
          <p>
            <strong>Last Validated:</strong> {source.last_validated_at ? new Date(source.last_validated_at).toLocaleDateString() : 'Never'}
          </p>
          {source.source_type === 'shopify' && source.config?.api_version && (
            <p>
              <strong>API Version:</strong> {source.config.api_version}
            </p>
          )}
          <p>
            <strong>Datasets:</strong> {source.datasets_count}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onTest(source.id)}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(source.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(source.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
