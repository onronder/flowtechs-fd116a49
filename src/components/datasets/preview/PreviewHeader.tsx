
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PreviewHeaderProps {
  title: string;
}

export default function PreviewHeader({ title }: PreviewHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogDescription id="dataset-preview-description">
        Preview data and results from dataset execution
      </DialogDescription>
    </DialogHeader>
  );
}
