
/**
 * Common types for source-related components and functions
 */

export interface ValidationResult {
  success: boolean;
  message?: string;
  updated?: boolean;
  config?: Record<string, any>;
  shopInfo?: {
    name: string;
    plan?: { displayName?: string };
  };
  connectionInfo?: {
    host: string;
    protocol: string;
    connectionStatus: string;
  };
  apiInfo?: {
    baseUrl: string;
    connectionStatus: string;
  };
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  updated?: boolean;
  id?: string;
}
