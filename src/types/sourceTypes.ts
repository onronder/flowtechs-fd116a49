
// src/types/sourceTypes.ts
export interface ShopifyCredentials {
  storeName: string;
  clientId: string;
  apiSecret: string;
  accessToken: string;
  api_version?: string;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  config?: any;
  shopInfo?: any;
}

export interface TestConnectionResult {
  success: boolean;
  updated?: boolean;
  message?: string;
}
