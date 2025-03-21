
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { checkSourceNameExists } from "@/utils/sourceSaveUtils";
import { validateSourceConnection } from "@/api/sourceApi";
import { SourceData } from "@/types/source";

// Define the step type
export type SourceFormStep = "type" | "info" | "credentials" | "validate";

const defaultShopifySchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  storeName: z.string().min(1, { message: "Store name is required" }),
  clientId: z.string().min(1, { message: "Client ID is required" }),
  apiSecret: z.string().min(1, { message: "API Secret is required" }),
  accessToken: z.string().min(1, { message: "Access token is required" }),
  api_version: z.string().min(1, { message: "API version is required" }),
});

interface UseSourceFormOptions {
  nameValidation?: boolean;
  initialStep?: SourceFormStep;
}

export default function useSourceForm(
  existingSource = null,
  options: UseSourceFormOptions = {
    nameValidation: true,
    initialStep: "type"
  }
) {
  // Convert numeric step to SourceFormStep type
  const [currentStep, setCurrentStep] = useState<SourceFormStep>(options.initialStep || "type");
  const [step, setStep] = useState(1);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Extract source data for the form
  const initialData = existingSource || {};
  const isEdit = !!existingSource;
  
  // Initialize sourceData state with the correct structure
  const [sourceData, setSourceData] = useState<SourceData>({
    type: initialData.source_type || "",
    name: initialData.name || "",
    description: initialData.description || "",
    credentials: initialData.config || {},
    validationResult: null
  });

  const form = useForm({
    resolver: zodResolver(defaultShopifySchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      storeName: "",
      clientId: "",
      apiSecret: "",
      accessToken: "",
      api_version: "2023-10",
    },
  });

  const checkNameUnique = async (name: string) => {
    if (!options.nameValidation) return true;
    
    try {
      const exists = await checkSourceNameExists(
        name, 
        existingSource?.id
      );
      return !exists;
    } catch (error) {
      console.error("Error checking name:", error);
      return true; // Allow submission on error
    }
  };

  const validateConnection = async (data: any) => {
    setIsValidating(true);
    setErrorMessage("");
    
    try {
      setValidationResult(null);
      
      const result = await validateSourceConnection(data);
      
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error("Validation error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Validation failed");
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  // Handle type selection
  const handleTypeSelection = (type: string) => {
    setSourceData(prev => ({
      ...prev,
      type
    }));
    setCurrentStep("info");
  };

  // Handle info submission
  const handleInfoSubmit = (data: { name: string; description: string }) => {
    setSourceData(prev => ({
      ...prev,
      name: data.name,
      description: data.description
    }));
    setCurrentStep("credentials");
  };

  // Handle credentials submission
  const handleCredentialsSubmit = async (credentials: any) => {
    try {
      setIsValidating(true);
      
      // Update source data with credentials
      const updatedSourceData = {
        ...sourceData,
        credentials
      };
      
      setSourceData(updatedSourceData);
      
      // Validate connection
      const result = await validateSourceConnection({
        type: updatedSourceData.type,
        ...credentials
      });
      
      // If validation is successful, update source data and move to next step
      if (result && result.success) {
        setSourceData({
          ...updatedSourceData,
          validationResult: result
        });
        setCurrentStep("validate");
      } else {
        throw new Error(result?.error || "Validation failed");
      }
    } catch (error) {
      console.error("Error validating credentials:", error);
      setErrorMessage(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);
  const resetSteps = () => setStep(1);

  return {
    form,
    step,
    nextStep,
    prevStep,
    resetSteps,
    isValidating,
    validationResult,
    errorMessage,
    validateConnection,
    checkNameUnique,
    // Additional properties needed by CreateSourceStepper
    currentStep,
    setCurrentStep,
    sourceData,
    isEdit,
    handleTypeSelection,
    handleInfoSubmit,
    handleCredentialsSubmit
  };
}
