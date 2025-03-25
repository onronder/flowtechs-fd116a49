
// Add or update the SourceData and SourceDataForApi types
export interface SourceData {
  type: string;
  name: string;
  description?: string;
  credentials: Record<string, any>;
  validationResult: any;
}

export interface SourceDataForApi {
  name: string;
  description?: string;
  source_type: string;
  config: Record<string, any>;
  validationResult?: any;
  forceLatestVersion?: boolean;
}
