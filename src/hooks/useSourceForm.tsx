import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { checkSourceNameExists } from "@/utils/sourceSaveUtils";
import { validateSourceConnection } from "@/api/sourceApi";

// Define the step type
export type SourceFormStep = "type" | "info" | "credentials" | "validate";

const defaultShopifySchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  storeName: z.string().min(1, { message: "Store name is required" }),
  clientId: z.string().min(1, { message: "Client ID is required" }),
  accessToken: z.string().min(1, { message: "Access token is required" }),
  api_version: z.string().min(1, { message: "API version is required" }),
});

export default function useSourceForm(
  initialData = null,
  options = {
    nameValidation: true,
  }
) {
  const [step, setStep] = useState(1);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm({
    resolver: zodResolver(defaultShopifySchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      storeName: "",
      clientId: "",
      accessToken: "",
      api_version: "2023-10",
    },
  });

  const checkNameUnique = async (name: string) => {
    if (!options.nameValidation) return true;
    
    try {
      const exists = await checkSourceNameExists(
        name, 
        initialData?.id
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
  };
}
