// src/components/datasets/NewDatasetModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { fetchUserSources } from "@/api/sourcesApi";
import SourceSelector from "./SourceSelector";
import DatasetTypeSelector from "./DatasetTypeSelector";
import PredefinedDatasetForm from "./PredefinedDatasetForm";
import DependentDatasetForm from "./DependentDatasetForm";
import CustomDatasetForm from "./CustomDatasetForm";

export default function NewDatasetModal({ isOpen, onClose, onDatasetCreated }) {
  const [step, setStep] = useState("source");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [datasetType, setDatasetType] = useState(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen) {
      loadSources();
    }
  }, [isOpen]);

  async function loadSources() {
    try {
      setLoading(true);
      // This function should be defined in your sourcesApi.ts file
      const data = await fetchUserSources();
      setSources(data);
    } catch (error) {
      console.error("Error loading sources:", error);
      toast({
        title: "Error",
        description: "Failed to load sources. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSourceSelect(source) {
    setSelectedSource(source);
    setStep("type");
  }

  function handleTypeSelect(type) {
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
            {step === "configure" && `Configure ${datasetType === "predefined" ? "Predefined" : 
              datasetType === "dependent" ? "Dependent" : "Custom"} Dataset`}
          </DialogTitle>
        </DialogHeader>
        <div>
          {step === "source" && (
            <SourceSelector
              sources={sources}
              loading={loading}
              onSelect={handleSourceSelect}
            />
          )}
          {step === "type" && (
            <DatasetTypeSelector
              sourceType={selectedSource.source_type}
              onSelect={handleTypeSelect}
              onBack={handleBack}
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