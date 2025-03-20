// src/components/datasets/NewDatasetModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { fetchUserSources } from "@/api/sourcesApi";
import SourceSelector from "./SourceSelector";
import DatasetTypeSelector from "./DatasetTypeSelector";
import PredefinedDatasetForm from "./PredefinedDatasetForm";
import DependentDatasetForm from "./DependentDatasetForm";
import CustomDatasetForm from "./CustomDatasetForm";

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

  // Reset the state when the modal is opened
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === "source" && "Select Data Source"}
            {step === "type" && "Select Dataset Type"}
            {step === "configure" && `Configure ${datasetType === "predefined" ? "Predefined" : datasetType === "dependent" ? "Dependent" : "Custom"} Dataset`}
          </DialogTitle>
        </DialogHeader>
        <div>
          {step === "source" && (
            <SourceSelector onSelect={handleSourceSelect} />
          )}
          {step === "type" && (
            <DatasetTypeSelector 
              onSelect={handleTypeSelect}
              onBack={handleBack}
              sourceType={selectedSource?.source_type}
            />
          )}
          {step === "configure" && datasetType === "predefined" && (
            <PredefinedDatasetForm
              source={selectedSource}
              onBack={handleBack}
              onComplete={handleDatasetCreated}
            />
          )}
          {step === "configure" && datasetType === "dependent" && (
            <DependentDatasetForm
              source={selectedSource}
              onBack={handleBack}
              onComplete={handleDatasetCreated}
            />
          )}
          {step === "configure" && datasetType === "custom" && (
            <CustomDatasetForm
              source={selectedSource}
              onBack={handleBack}
              onComplete={handleDatasetCreated}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}