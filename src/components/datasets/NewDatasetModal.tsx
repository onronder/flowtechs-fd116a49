
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DatasetTypeSelector from "./DatasetTypeSelector";
import SourceSelector from "./SourceSelector";
import PredefinedDatasetForm from "./PredefinedDatasetForm";
import DependentDatasetForm from "./DependentDatasetForm";
import CustomDatasetForm from "./CustomDatasetForm";
import { fetchDatasetTemplates } from "@/api/datasetsApi";
import { useToast } from "@/hooks/use-toast";

interface NewDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetCreated: () => void;
}

export default function NewDatasetModal({ isOpen, onClose, onDatasetCreated }: NewDatasetModalProps) {
  const [step, setStep] = useState<'type' | 'source' | 'configure'>('type');
  const [datasetType, setDatasetType] = useState<'predefined' | 'dependent' | 'custom' | null>(null);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('type');
      setDatasetType(null);
      setSelectedSource(null);
      
      // Load templates
      loadTemplates();
    }
  }, [isOpen]);

  async function loadTemplates() {
    try {
      setIsLoading(true);
      const data = await fetchDatasetTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load dataset templates.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectDatasetType(type: 'predefined' | 'dependent' | 'custom') {
    setDatasetType(type);
    setStep('source');
  }

  function handleSelectSource(source: any) {
    setSelectedSource(source);
    setStep('configure');
  }

  function handleBackFromSource() {
    setStep('type');
    setSelectedSource(null);
  }

  function handleBackFromConfigure() {
    setStep('source');
  }

  function handleComplete() {
    onDatasetCreated();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <div className="text-xl font-semibold">Create New Dataset</div>
        <Separator />
        
        <div className="flex-1 overflow-auto">
          {step === 'type' && (
            <DatasetTypeSelector onSelect={handleSelectDatasetType} />
          )}
          
          {step === 'source' && (
            <SourceSelector 
              onSelect={handleSelectSource}
              onBack={handleBackFromSource}
            />
          )}
          
          {step === 'configure' && datasetType === 'predefined' && (
            <PredefinedDatasetForm 
              source={selectedSource}
              templates={templates}
              onBack={handleBackFromConfigure}
              onComplete={handleComplete}
            />
          )}
          
          {step === 'configure' && datasetType === 'dependent' && (
            <DependentDatasetForm 
              source={selectedSource}
              onBack={handleBackFromConfigure}
              onComplete={handleComplete}
            />
          )}
          
          {step === 'configure' && datasetType === 'custom' && (
            <CustomDatasetForm 
              source={selectedSource}
              onBack={handleBackFromConfigure}
              onComplete={handleComplete}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
