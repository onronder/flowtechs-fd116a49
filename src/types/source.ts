
/**
 * Common types for source-related components
 */

export interface SourceData {
  type: string;
  name: string;
  description?: string;
  credentials: Record<string, any>;
  validationResult?: any;
}

export interface SourceDataForApi {
  name: string;
  description?: string;
  source_type: string;
  config: Record<string, any>;
}

export interface ValidationStepProps {
  sourceData: SourceData;
  onBack: () => void;
  existingId?: string;
}
