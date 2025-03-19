
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { validateSourceConnection } from "@/api/sourceApi";

// Types for the hook
export interface SourceFormData {
  type: string;
  name: string;
  description: string;
  credentials: Record<string, any>;
  validationResult: any | null;
}

export type SourceFormStep = "type" | "info" | "credentials" | "validate";

export interface UseSourceFormProps {
  existingSource?: any;
}

export function useSourceForm({ existingSource }: UseSourceFormProps = {}) {
  const isEdit = !!existingSource;
  
  const [currentStep, setCurrentStep] = useState<SourceFormStep>(isEdit ? "info" : "type");
  const [sourceData, setSourceData] = useState<SourceFormData>({
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

  return {
    currentStep,
    setCurrentStep,
    sourceData,
    isValidating,
    isEdit,
    handleTypeSelection,
    handleInfoSubmit,
    handleCredentialsSubmit
  };
}
