
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PreviewHeaderProps {
  title: string;
  datasetType?: string;
  templateName?: string;
}

export default function PreviewHeader({ 
  title, 
  datasetType,
  templateName 
}: PreviewHeaderProps) {
  return (
    <DialogHeader className="px-6 pt-6 pb-4 border-b">
      <DialogTitle className="text-xl font-semibold flex items-center gap-2">
        {title}
        <span className="ml-auto flex gap-2">
          {datasetType && (
            <Badge variant="outline" className="capitalize">
              {datasetType.replace('_', ' ')}
            </Badge>
          )}
          {templateName && (
            <Badge variant="secondary" className="capitalize">
              {templateName}
            </Badge>
          )}
        </span>
      </DialogTitle>
    </DialogHeader>
  );
}
