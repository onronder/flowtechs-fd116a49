
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import SourceTypeSelection from "./SourceTypeSelection";
import BasicInfoForm from "./BasicInfoForm";
import ShopifyCredentialsForm from "./ShopifyCredentialsForm";
import ValidationStep from "./ValidationStep";
import StepperHeader from "./StepperHeader";
import { useSourceForm } from "@/hooks/useSourceForm";

interface CreateSourceStepperProps {
  existingSource?: any;
  onCancel: () => void;
}

export default function CreateSourceStepper({ existingSource, onCancel }: CreateSourceStepperProps) {
  const { 
    currentStep, 
    setCurrentStep,
    sourceData, 
    isValidating,
    isEdit,
    handleTypeSelection,
    handleInfoSubmit,
    handleCredentialsSubmit
  } = useSourceForm({ existingSource });

  // Helper for step descriptions
  const getStepDescription = (step: string): string => {
    switch (step) {
      case "type": return "Choose the type of data source you want to connect to.";
      case "info": return "Provide a name and description for your data source.";
      case "credentials": return "Enter the required credentials to connect to your data source.";
      case "validate": return "Review your data source details and save the connection.";
      default: return "";
    }
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Edit Source" : "Add New Data Source"}
        </CardTitle>
        <CardDescription>
          {getStepDescription(currentStep)}
        </CardDescription>
      </CardHeader>
      
      {/* Stepper header component */}
      <StepperHeader currentStep={currentStep} />
      
      <CardContent>
        {currentStep === "type" && (
          <SourceTypeSelection onSelect={handleTypeSelection} />
        )}
        
        {currentStep === "info" && (
          <BasicInfoForm 
            initialData={{ 
              name: sourceData.name, 
              description: sourceData.description 
            }}
            onSubmit={handleInfoSubmit}
            onBack={() => isEdit ? onCancel() : setCurrentStep("type")}
          />
        )}
        
        {currentStep === "credentials" && sourceData.type === "shopify" && (
          <ShopifyCredentialsForm
            initialData={sourceData.credentials}
            onSubmit={handleCredentialsSubmit}
            onBack={() => setCurrentStep("info")}
            isSubmitting={isValidating}
          />
        )}
        
        {currentStep === "validate" && (
          <ValidationStep
            sourceData={sourceData}
            onBack={() => setCurrentStep("credentials")}
            existingId={existingSource?.id}
          />
        )}
      </CardContent>
    </Card>
  );
}
