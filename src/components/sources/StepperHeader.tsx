
import React from "react";
import { SourceFormStep } from "@/hooks/useSourceForm";

interface StepperHeaderProps {
  currentStep: SourceFormStep;
}

interface Step {
  id: SourceFormStep;
  title: string;
}

const steps: Step[] = [
  { id: "type", title: "Source Type" },
  { id: "info", title: "Basic Info" },
  { id: "credentials", title: "Credentials" },
  { id: "validate", title: "Validate" }
];

function getStepIndex(stepId: SourceFormStep): number {
  return steps.findIndex(step => step.id === stepId);
}

export default function StepperHeader({ currentStep }: StepperHeaderProps) {
  return (
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
  );
}
