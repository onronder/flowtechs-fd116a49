
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to migrate datasets from the old flow to the new direct API flow
 */
export async function updateDatasetExecutionFlow() {
  try {
    // Get datasets that use the old predefined templates but need direct API
    const templateToEdgeFunction: Record<string, string> = {
      'customer-acquisition-timeline': 'pre_customer_acquisition_timeline',
      'recent-orders-dashboard': 'pre_recent_orders_dashboard',
      'order-fulfillment-status': 'pre_order_fulfillment_status',
      'sales-by-geographic-region': 'pre_sales_by_geographic_region',
      'inventory-status-overview': 'pre_inventory_status_overview'
    };
    
    // Map template IDs to their display names
    const templateToDisplayName: Record<string, string> = {
      'customer-acquisition-timeline': 'Customer Acquisition Timeline',
      'recent-orders-dashboard': 'Recent Orders Dashboard',
      'order-fulfillment-status': 'Order Fulfillment Status',
      'sales-by-geographic-region': 'Sales by Geographic Region',
      'inventory-status-overview': 'Inventory Status Overview'
    };
    
    // Find datasets using the old predefined type that should be direct_api
    // Don't use the template_id::text conversion as it's causing issues
    const { data: outdatedDatasets, error } = await supabase
      .from("user_datasets")
      .select("id, name, template_id")
      .eq("dataset_type", "predefined");
      
    if (error) {
      console.error("Error checking for outdated datasets:", error);
      return { updated: 0, error: error.message };
    }
    
    // Filter the datasets that have template_id matching our keys
    const datasetsToMigrate = outdatedDatasets?.filter(
      dataset => dataset.template_id && Object.keys(templateToEdgeFunction).includes(dataset.template_id)
    ) || [];
    
    console.log(`Found ${datasetsToMigrate.length} datasets to migrate to direct API flow`);
    
    let updatedCount = 0;
    
    // Update each dataset to use the direct_api flow
    if (datasetsToMigrate.length > 0) {
      for (const dataset of datasetsToMigrate) {
        const templateId = dataset.template_id as string;
        const edgeFunction = templateToEdgeFunction[templateId];
        const displayName = templateToDisplayName[templateId];
        
        if (edgeFunction) {
          const { error: updateError } = await supabase
            .from("user_datasets")
            .update({
              dataset_type: "direct_api",
              parameters: {
                edge_function: edgeFunction,
                template_name: displayName
              }
            })
            .eq("id", dataset.id);
            
          if (updateError) {
            console.error(`Error updating dataset ${dataset.id}:`, updateError);
          } else {
            console.log(`Successfully migrated dataset ${dataset.id} "${dataset.name}" to direct API flow`);
            updatedCount++;
          }
        }
      }
    }
    
    return { updated: updatedCount };
  } catch (error) {
    console.error("Error in updateDatasetExecutionFlow:", error);
    return { updated: 0, error: String(error) };
  }
}
