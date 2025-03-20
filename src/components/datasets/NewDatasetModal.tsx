
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSources } from "@/hooks/useSources";

interface NewDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetCreated: () => void;
}

export default function NewDatasetModal({ isOpen, onClose, onDatasetCreated }: NewDatasetModalProps) {
  const [step, setStep] = useState("source");
  const { sources, loading } = useSources();
  const { toast } = useToast();

  function handleCreateDataset() {
    toast({
      title: "Coming Soon",
      description: "Dataset creation functionality will be available soon.",
    });
    onDatasetCreated();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Dataset</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-6 mb-6">
              <div className="h-12 w-12 text-primary">📊</div>
            </div>
            
            <h3 className="text-xl font-semibold mb-2">Dataset Creation</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              The complete dataset creation functionality is currently being implemented and will be available soon.
            </p>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreateDataset}>Create Placeholder Dataset</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
