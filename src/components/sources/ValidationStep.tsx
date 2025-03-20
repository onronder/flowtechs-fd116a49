
import { useState } from "react";
import { SourceData } from "@/types/source";
import SourceInfoDisplay from "./SourceInfoDisplay";
import SourceValidationDetails from "./SourceValidationDetails";
import ConnectionSuccessMessage from "./ConnectionSuccessMessage";
import ValidationStepActions from "./ValidationStepActions";
import useSaveSource from "@/hooks/useSaveSource";

interface ValidationStepProps {
  sourceData: SourceData;
  onBack: () => void;
  existingId?: string;
}

export default function ValidationStep({ sourceData, onBack, existingId }: ValidationStepProps) {
  const { isSaving, handleSaveSource } = useSaveSource();

  const handleSave = async () => {
    // Convert from our internal format to the API format
    const apiSourceData = {
      name: sourceData.name,
      description: sourceData.description,
      source_type: sourceData.type,
      config: sourceData.credentials,
      validationResult: sourceData.validationResult
    };
    
    await handleSaveSource(apiSourceData, existingId);
  };

  return (
    <div className="space-y-6">
      <ConnectionSuccessMessage />

      <div className="space-y-4">
        <SourceInfoDisplay
          sourceType={sourceData.type}
          name={sourceData.name}
          description={sourceData.description}
        />

        <SourceValidationDetails
          sourceType={sourceData.type}
          validationResult={sourceData.validationResult}
          credentials={sourceData.credentials}
        />
      </div>

      <ValidationStepActions
        onBack={onBack}
        onSave={handleSave}
        isSaving={isSaving}
        existingId={existingId}
      />
    </div>
  );
}
