
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
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  updated?: boolean;
  id?: string;
  error?: string;
}

export interface ShopifyCredentials {
  storeName: string;
  clientId: string;
  accessToken: string;
  api_version?: string;
}
