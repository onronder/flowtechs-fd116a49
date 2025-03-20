
import { updateSourceApiVersionAndSchema } from './shopifyApi';
import { supabase } from "@/integrations/supabase/client";

/**
 * Scheduled job to update all Shopify sources to the latest API version
 * This should be run weekly via a cron job or scheduled task
 */
export async function updateAllShopifySources(): Promise<{
  total: number;
  updated: number;
  failed: number;
  sources: any[];
}> {
  const results = {
    total: 0,
    updated: 0,
    failed: 0,
    sources: []
  };
  
  try {
    // Get all Shopify sources
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('source_type', 'shopify')
      .eq('is_active', true);
    
    if (error) throw error;
    
    results.total = sources?.length || 0;
    
    if (!sources || sources.length === 0) {
      console.log('No Shopify sources to update');
      return results;
    }
    
    // Process each source
    for (const source of sources) {
      try {
        const updated = await updateSourceApiVersionAndSchema(source.id);
        
        results.sources.push({
          id: source.id,
          name: source.name,
          updated
        });
        
        if (updated) {
          results.updated++;
        }
      } catch (sourceError) {
        console.error(`Error updating source ${source.id}:`, sourceError);
        results.failed++;
        results.sources.push({
          id: source.id,
          name: source.name,
          error: sourceError.message
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in updateAllShopifySources:', error);
    throw error;
  }
}
