/**
 * Utility functions for handling sensitive information in API operations
 */

/**
 * Redacts sensitive information from credentials for logging
 */
export function redactSensitiveInfo(credentials: any) {
  if (!credentials) return {};
  
  const redacted = { ...credentials };
  const sensitiveFields = ['accessToken', 'apiKey', 'password', 'consumerSecret', 'secretKey', 'token', 'apiSecret', 'clientId', 'clientSecret', 'secret'];
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = "REDACTED";
    }
  }
  
  return redacted;
}

/**
 * Returns a safe version of a source or dataset object with sensitive fields redacted
 * for client-side display
 */
export function createSecureSourceObject(source: any) {
  if (!source) return null;
  
  // Create a clean copy without sensitive info
  const secureSource = { ...source };
  
  // If there's a config object with sensitive info, redact it
  if (secureSource.config) {
    secureSource.config = {
      ...secureSource.config,
      // Keep only non-sensitive fields
      storeName: secureSource.config.storeName,
      domain: secureSource.config.domain,
      apiVersion: secureSource.config.apiVersion || secureSource.config.api_version,
      // Indicate that sensitive fields are present but redacted
      hasAccessToken: !!secureSource.config.accessToken,
      hasApiSecret: !!secureSource.config.apiSecret,
      hasClientId: !!secureSource.config.clientId
    };
    
    // Remove any sensitive fields directly
    const sensitiveFields = ['accessToken', 'apiKey', 'password', 'consumerSecret', 'secretKey', 'token', 'apiSecret', 'clientId', 'clientSecret', 'secret'];
    
    for (const field of sensitiveFields) {
      if (field in secureSource.config) {
        delete secureSource.config[field];
      }
    }
  }
  
  return secureSource;
}
