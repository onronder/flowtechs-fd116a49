
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logging";

const COMPONENT = "schemaPermissions";

/**
 * Permission information interface for schema access
 */
export interface SchemaPermissionInfo {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  isOwner: boolean;
  role?: string;
}

/**
 * Checks if the current user has appropriate permissions for a schema
 * @param schemaId Schema ID to check
 * @returns Permission information
 */
export async function checkSchemaPermissions(schemaId: string): Promise<SchemaPermissionInfo> {
  try {
    // Since the check_schema_permissions RPC is not in the typed functions,
    // we need to use a more generic approach with type assertion
    const response = await supabase.rpc(
      'check_schema_permissions' as any, 
      { p_schema_id: schemaId }
    );
    
    const { data, error } = response as unknown as { 
      data: SchemaPermissionInfo, 
      error: { message: string } | null 
    };
    
    if (error) {
      logger.error(
        COMPONENT,
        `Error checking schema permissions`,
        { schemaId, errorMessage: error.message },
        new Error(error.message)
      );
      
      // Default to view-only if error
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canShare: false,
        isOwner: false
      };
    }
    
    return data;
  } catch (error) {
    logger.error(
      COMPONENT,
      `Exception checking schema permissions`,
      { schemaId, errorMessage: error.message },
      error,
      { tags: ['schema-permissions'] }
    );
    
    // Default to view-only if exception
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canShare: false,
      isOwner: false
    };
  }
}
