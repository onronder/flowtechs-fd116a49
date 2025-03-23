
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface PreviewHeaderProps {
  title: string;
  datasetType?: string;
  templateName?: string;
}

export default function PreviewHeader({ title, datasetType, templateName }: PreviewHeaderProps) {
  return (
    <DialogHeader className="space-y-2">
      <DialogTitle className="flex items-center gap-2">
        {title}
        {datasetType && (
          <Badge variant="outline" className="ml-2 text-xs">
            {datasetType}
          </Badge>
        )}
      </DialogTitle>
      
      <DialogDescription id="dataset-preview-description" className="flex items-center gap-2">
        <span>Preview data and results from dataset execution</span>
        {templateName && (
          <Badge variant="secondary" className="text-xs">
            Template: {templateName}
          </Badge>
        )}
      </DialogDescription>
    </DialogHeader>
  );
}
