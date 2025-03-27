
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DatasetIntroduction from "@/components/datasets/creation/DatasetIntroduction";
import SourceSelectionStep from "@/components/datasets/creation/SourceSelectionStep";
import DatasetTypeSelectionStep from "@/components/datasets/creation/DatasetTypeSelectionStep";
import PredefinedCategoriesStep from "@/components/datasets/creation/predefined/PredefinedCategoriesStep";
import PredefinedQuerySelectionStep from "@/components/datasets/creation/predefined/PredefinedQuerySelectionStep";
import DependentCategoriesStep from "@/components/datasets/creation/dependent/DependentCategoriesStep";
import DependentQuerySelectionStep from "@/components/datasets/creation/dependent/DependentQuerySelectionStep";
import CustomQueryBuilder from "@/components/datasets/customQueryBuilder/CustomQueryBuilder";
import DatasetConfigurationStep from "@/components/datasets/creation/DatasetConfigurationStep";

export default function DatasetCreate() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<string>("introduction");
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [datasetType, setDatasetType] = useState<"predefined" | "dependent" | "custom" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [customQueryData, setCustomQueryData] = useState<any>(null);

  // Handle back navigation based on current step
  const handleBack = () => {
    if (currentStep === "introduction") {
      navigate("/datasets");
    } else if (currentStep === "source") {
      setCurrentStep("introduction");
    } else if (currentStep === "type") {
      setCurrentStep("source");
      setDatasetType(null);
    } else if (currentStep === "predefinedCategory" || currentStep === "dependentCategory" || currentStep === "customBuilder") {
      setCurrentStep("type");
      setSelectedCategory(null);
    } else if (currentStep === "predefinedQuery" || currentStep === "dependentQuery") {
      if (datasetType === "predefined") {
        setCurrentStep("predefinedCategory");
      } else {
        setCurrentStep("dependentCategory");
      }
      setSelectedQuery(null);
    } else if (currentStep === "configure") {
      if (datasetType === "predefined") {
        setCurrentStep("predefinedQuery");
      } else if (datasetType === "dependent") {
        setCurrentStep("dependentQuery");
      } else {
        setCurrentStep("customBuilder");
      }
    }
  };

  // Handle source selection
  const handleSourceSelect = (source: any) => {
    setSelectedSource(source);
    setCurrentStep("type");
  };

  // Handle dataset type selection
  const handleTypeSelect = (type: "predefined" | "dependent" | "custom") => {
    setDatasetType(type);
    if (type === "predefined") {
      setCurrentStep("predefinedCategory");
    } else if (type === "dependent") {
      setCurrentStep("dependentCategory");
    } else {
      setCurrentStep("customBuilder");
    }
  };

  // Handle category selection for predefined queries
  const handlePredefinedCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentStep("predefinedQuery");
  };

  // Handle category selection for dependent queries
  const handleDependentCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentStep("dependentQuery");
  };

  // Handle query selection for predefined or dependent queries
  const handleQuerySelect = (query: any) => {
    setSelectedQuery(query);
    setCurrentStep("configure");
  };

  // Handle custom query builder completion
  const handleCustomQueryComplete = (data: any) => {
    setCustomQueryData(data);
    setCurrentStep("configure");
  };

  // Handle dataset creation completion
  const handleDatasetCreated = () => {
    navigate("/datasets");
  };

  // Get step title based on current step
  const getStepTitle = () => {
    switch (currentStep) {
      case "introduction": return "Create a New Dataset";
      case "source": return "Select Data Source";
      case "type": return "Select Dataset Type";
      case "predefinedCategory": return "Select Predefined Category";
      case "dependentCategory": return "Select Dependent Category";
      case "predefinedQuery": return "Select Predefined Query";
      case "dependentQuery": return "Select Dependent Query";
      case "customBuilder": return "Custom Query Builder";
      case "configure": return "Configure Dataset";
      default: return "Create Dataset";
    }
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-4" 
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{getStepTitle()}</h1>
          <p className="text-muted-foreground">
            {currentStep === "introduction" ? "Learn about datasets and how they work" : 
             currentStep === "source" ? "Choose a data source for your dataset" :
             currentStep === "type" ? "Select the type of dataset you want to create" :
             currentStep === "configure" ? "Configure your dataset details" :
             "Build your dataset step by step"}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {currentStep === "introduction" && (
          <DatasetIntroduction onContinue={() => setCurrentStep("source")} />
        )}
        
        {currentStep === "source" && (
          <SourceSelectionStep onSelect={handleSourceSelect} />
        )}
        
        {currentStep === "type" && (
          <DatasetTypeSelectionStep 
            sourceType={selectedSource?.source_type} 
            onSelect={handleTypeSelect} 
          />
        )}
        
        {currentStep === "predefinedCategory" && (
          <PredefinedCategoriesStep 
            sourceType={selectedSource?.source_type}
            onSelect={handlePredefinedCategorySelect} 
          />
        )}
        
        {currentStep === "dependentCategory" && (
          <DependentCategoriesStep 
            sourceType={selectedSource?.source_type}
            onSelect={handleDependentCategorySelect} 
          />
        )}
        
        {currentStep === "predefinedQuery" && (
          <PredefinedQuerySelectionStep 
            sourceType={selectedSource?.source_type}
            category={selectedCategory}
            onSelect={handleQuerySelect} 
          />
        )}
        
        {currentStep === "dependentQuery" && (
          <DependentQuerySelectionStep 
            sourceType={selectedSource?.source_type}
            category={selectedCategory}
            onSelect={handleQuerySelect} 
          />
        )}
        
        {currentStep === "customBuilder" && (
          <CustomQueryBuilder 
            source={selectedSource}
            onComplete={handleCustomQueryComplete}
            onBack={handleBack}
          />
        )}
        
        {currentStep === "configure" && (
          <DatasetConfigurationStep 
            source={selectedSource}
            datasetType={datasetType}
            queryData={datasetType === "custom" ? customQueryData : selectedQuery}
            onComplete={handleDatasetCreated}
          />
        )}
      </div>
    </div>
  );
}
