
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayIcon, Pencil, Trash2, Loader, Calendar, Clock, ExternalLink, Database } from "lucide-react";
import { Source } from "@/hooks/useSources";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  
  const formattedDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getSourceTypeIcon = () => {
    switch (source.source_type) {
      case 'shopify':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">Shopify</Badge>;
      case 'woocommerce':
        return <Badge className="bg-secondary/10 text-secondary hover:bg-secondary/20 border-none">WooCommerce</Badge>;
      case 'ftp_sftp':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-none">FTP</Badge>;
      case 'custom_api':
        return <Badge className="bg-info/10 text-info hover:bg-info/20 border-none">API</Badge>;
      default:
        return <Badge>{source.source_type}</Badge>;
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-xl font-semibold truncate" title={source.name}>{source.name}</CardTitle>
          {getSourceTypeIcon()}
        </div>
        <CardDescription className="line-clamp-2 h-10" title={source.description || ""}>
          {source.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 opacity-70" />
            <span>Last Validated:</span>
          </div>
          <div className="text-sm font-medium">
            {formattedDate(source.last_validated_at)}
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 opacity-70" />
            <span>Created:</span>
          </div>
          <div className="text-sm font-medium">
            {formattedDate(source.created_at)}
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Database className="h-3.5 w-3.5 opacity-70" />
            <span>Datasets:</span>
          </div>
          <div className="text-sm font-medium">
            {source.datasets_count || 0}
          </div>
          
          {source.source_type === 'shopify' && source.config?.api_version && (
            <>
              <div className="flex items-center gap-1 text-muted-foreground">
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                <span>API Version:</span>
              </div>
              <div className="text-sm font-medium">
                {source.config.api_version}
              </div>
            </>
          )}
        </div>
        
        <div className="mt-3 flex gap-1">
          {source.is_active ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTest(source.id)}
          disabled={isTesting}
          className="flex items-center gap-1.5 text-xs"
        >
          {isTesting ? (
            <>
              <Loader className="h-3.5 w-3.5 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <PlayIcon className="h-3.5 w-3.5" />
              Test Connection
            </>
          )}
        </Button>
        
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(source.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the source "{source.name}" and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(source.id)}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
