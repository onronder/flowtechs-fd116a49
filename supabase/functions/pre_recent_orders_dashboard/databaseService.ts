
/**
 * Fetches the Shopify source data for a user
 */
export async function fetchShopifySource(supabase: any, userId: string) {
  const { data: sourceData, error: sourceError } = await supabase
    .from('sources')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', 'shopify')
    .eq('is_active', true)
    .single()

  if (sourceError || !sourceData) {
    throw new Error('Shopify source not found');
  }

  // Extract Shopify credentials from source config
  const { storeName, accessToken, api_version } = sourceData.config

  if (!storeName || !accessToken) {
    throw new Error('Invalid Shopify credentials');
  }

  return sourceData;
}

/**
 * Interface for logging operations
 */
interface LogOperation {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
}

/**
 * Logs an operation to the audit_logs table
 */
export async function logOperation(supabase: any, logData: LogOperation) {
  try {
    await supabase
      .from('audit_logs')
      .insert([{
        user_id: logData.userId,
        action: logData.action,
        resource_type: logData.resourceType,
        resource_id: logData.resourceId,
        details: logData.details
      }]);
  } catch (error) {
    console.error("Error logging operation:", error);
    // Don't throw, just log the error and continue
  }
}
