
/**
 * Utility functions for handling sensitive information in API operations
 */

/**
 * Redacts sensitive information from credentials for logging
 */
export function redactSensitiveInfo(credentials: any) {
  if (!credentials) return {};
  
  const redacted = { ...credentials };
  const sensitiveFields = ['accessToken', 'apiKey', 'password', 'consumerSecret', 'secretKey', 'token'];
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = "REDACTED";
    }
  }
  
  return redacted;
}
