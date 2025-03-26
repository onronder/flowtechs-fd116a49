
// src/components/datasets/NewDatasetModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SourceSelector from "./SourceSelector";
import DatasetTypeSelector from "./DatasetTypeSelector";
import PredefinedDatasetForm from "./PredefinedDatasetForm";
import DependentDatasetForm from "./DependentDatasetForm";
import CustomDatasetForm from "./CustomDatasetForm";
import { useMediaQuery } from "@/hooks/use-mobile";

interface NewDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetCreated: () => void;
}

export default function NewDatasetModal({ isOpen, onClose, onDatasetCreated }: NewDatasetModalProps) {
  const [step, setStep] = useState<"source" | "type" | "configure">("source");
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [datasetType, setDatasetType] = useState<"predefined" | "dependent" | "custom" | null>(null);
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (isOpen) {
      setStep("source");
      setSelectedSource(null);
      setDatasetType(null);
    }
  }, [isOpen]);

  function handleSourceSelect(source: any) {
    setSelectedSource(source);
    setStep("type");
  }

  function handleTypeSelect(type: "predefined" | "dependent" | "custom") {
    setDatasetType(type);
    setStep("configure");
  }

  function handleBack() {
    if (step === "configure") {
      setStep("type");
    } else if (step === "type") {
      setStep("source");
    }
  }

  function handleDatasetCreated() {
    toast({
      title: "Dataset Created",
      description: "Your new dataset has been created successfully.",
    });
    onDatasetCreated();
    onClose();
  }

  const getStepTitle = () => {
    if (step === "source") return "Select Data Source";
    if (step === "type") return "Select Dataset Type";
    if (step === "configure") {
      if (datasetType === "predefined") return "Configure Predefined Dataset";
      if (datasetType === "dependent") return "Configure Dependent Dataset";
      return "Configure Custom Dataset";
    }
    return "";
  };

  const renderContent = () => {
    if (step === "source") {
      return <SourceSelector onSelect={handleSourceSelect} />;
    }
    
    if (step === "type") {
      return (
        <DatasetTypeSelector 
          onSelect={handleTypeSelect}
          onBack={handleBack}
          sourceType={selectedSource?.source_type}
        />
      );
    }
    
    if (step === "configure") {
      if (datasetType === "predefined") {
        return (
          <PredefinedDatasetForm
            source={selectedSource}
            onBack={handleBack}
            onComplete={handleDatasetCreated}
          />
        );
      }
      
      if (datasetType === "dependent") {
        return (
          <DependentDatasetForm
            source={selectedSource}
            onBack={handleBack}
            onComplete={handleDatasetCreated}
          />
        );
      }
      
      if (datasetType === "custom") {
        return (
          <CustomDatasetForm
            source={selectedSource}
            onBack={handleBack}
            onComplete={handleDatasetCreated}
          />
        );
      }
    }
    
    return null;
  };

  // On mobile, use a full-screen Sheet component instead of a Dialog
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90dvh] sm:max-w-full">
          <SheetHeader className="mb-4">
            <SheetTitle>{getStepTitle()}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto py-2">{renderContent()}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto py-2">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
