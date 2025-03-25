
import React from "react";
import { Source } from "@/hooks/useSources";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayIcon, Pencil, Trash2, Loader, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  source: Source;
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isTesting?: boolean;
}

function SourceCard({
  source,
  onTest,
  onEdit,
  onDelete,
  isTesting = false
}: SourceCardProps) {
  const { toast } = useToast();

  const lastValidated = source.last_validated_at
    ? new Date(source.last_validated_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Never";

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{source.name}</CardTitle>
          {source.is_active ? (
            <Badge variant="outline">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
        <CardDescription>{source.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <p className="text-sm font-medium">Source Type</p>
            <p className="text-muted-foreground">{source.source_type}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Last Validated</p>
            <p className="text-muted-foreground">{lastValidated}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Datasets</p>
            <p className="text-muted-foreground">{source.datasets_count}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Jobs</p>
            <p className="text-muted-foreground">{source.jobs_count}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                source and remove all of its data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(source.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

interface SourcesGridProps {
  sources: Source[];
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
    return (new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
  });

  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedSources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          onTest={onTest}
          onEdit={onEdit}
          onDelete={onDelete}
          isTesting={testingSourceId === source.id}
        />
      ))}
      <Card className="bg-card border-border shadow-sm flex items-center justify-center">
        <CardContent className="flex items-center justify-center h-full">
          <Button variant="outline" onClick={onAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Source
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
