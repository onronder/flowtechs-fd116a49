import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { validateSourceConnection } from "@/api/sourceApi";

const steps = [
  { id: "type", title: "Source Type" },
  { id: "info", title: "Basic Info" },
  { id: "credentials", title: "Credentials" },
  { id: "validate", title: "Validate" }
];

interface CreateSourceStepperProps {
  existingSource?: any;
  onCancel: () => void;
}

export default function CreateSourceStepper({ existingSource, onCancel }: CreateSourceStepperProps) {
  const isEdit = !!existingSource;
  
  const [currentStep, setCurrentStep] = useState(isEdit ? "info" : "type");
  const [sourceData, setSourceData] = useState({
    type: existingSource?.source_type || "",
    name: existingSource?.name || "",
    description: existingSource?.description || "",
    credentials: existingSource?.config || {},
    validationResult: null
  });
  const [isValidating, setIsValidating] = useState(false);
  
  const { toast } = useToast();

  const handleTypeSelection = (type: string) => {
    setSourceData(prev => ({ ...prev, type }));
    setCurrentStep("info");
  };
  
  const handleInfoSubmit = (data: { name: string, description: string }) => {
    setSourceData(prev => ({ ...prev, ...data }));
    setCurrentStep("credentials");
  };
  
  const handleCredentialsSubmit = async (credentials: any) => {
    try {
      setIsValidating(true);
      
      // Log for debugging
      console.log("Validating credentials:", {
        sourceType: sourceData.type,
        credentials: { ...credentials, accessToken: "REDACTED" }
      });
      
      // Use the API service to validate connection
      const result = await validateSourceConnection(sourceData.type, credentials);
      
      if (result.success) {
        setSourceData(prev => ({ 
          ...prev, 
          credentials: result.config,
          validationResult: result 
        }));
        setCurrentStep("validate");
        
        toast({
          title: "Connection Successful",
          description: "Successfully connected to the data source."
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to the data source.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error validating connection:", error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "An error occurred while validating the connection.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Edit Source" : "Add New Data Source"}
        </CardTitle>
        <CardDescription>
          {currentStep === "type" && "Choose the type of data source you want to connect to."}
          {currentStep === "info" && "Provide a name and description for your data source."}
          {currentStep === "credentials" && "Enter the required credentials to connect to your data source."}
          {currentStep === "validate" && "Review your data source details and save the connection."}
        </CardDescription>
      </CardHeader>
      
      {/* Stepper header */}
      <div className="flex justify-between w-full px-6 mb-8">
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.id;
          const isPast = getStepIndex(currentStep) > index;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCurrent ? "bg-primary text-primary-foreground" : 
                isPast ? "bg-primary/20 text-primary" : 
                "bg-muted text-muted-foreground"
              }`}>
                {index + 1}
              </div>
              <div className="text-sm font-medium mt-2">{step.title}</div>
              
              {index < steps.length - 1 && (
                <div className={`absolute h-[2px] top-5 w-full left-1/2 -z-10 ${
                  isPast ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      
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

function getStepIndex(stepId: string): number {
  const stepOrder = ["type", "info", "credentials", "validate"];
  return stepOrder.indexOf(stepId);
}
