
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logging";

const COMPONENT = "schemaAccessLogs";

/**
 * Access log interface for schema audit logs
 */
export interface SchemaAccessLog {
  id: string;
  timestamp: string;
  action: string;
  user_id: string;
  ip_address: string;
  success: boolean;
  users?: { email: string };
}

/**
 * Get schema access audit logs
 * @param schemaId Schema ID to get logs for
 * @param limit Number of logs to return
 * @param offset Offset for pagination
 * @returns Audit logs
 */
export async function getSchemaAccessLogs(
  schemaId: string, 
  limit = 20, 
  offset = 0
): Promise<SchemaAccessLog[]> {
  try {
    // Since schema_access_logs is not in the type definitions,
    // we'll use a generic query approach with type assertion
    const response = await (supabase as any)
      .from('schema_access_logs')
      .select(`
        id, 
        timestamp, 
        action, 
        user_id, 
        ip_address, 
        success,
        users:user_id(email)
      `)
      .eq('schema_id', schemaId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    const { data, error } = response as unknown as {
      data: SchemaAccessLog[],
      error: { message: string } | null
    };
      
    if (error) {
      logger.error(
        COMPONENT,
        `Error fetching schema access logs`,
        { schemaId, errorMessage: error.message },
        new Error(error.message)
      );
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error(
      COMPONENT,
      `Exception fetching schema access logs`,
      { schemaId, errorMessage: error.message },
      error
    );
    return [];
  }
}
