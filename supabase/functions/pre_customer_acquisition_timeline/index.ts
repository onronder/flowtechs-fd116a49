
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, successResponse, errorResponse } from './cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;
  
  try {
    // Parse the request body
    const { credentials, executionId } = await req.json();
    
    if (!credentials || !executionId) {
      return errorResponse('Missing required parameters: credentials and executionId are required', null, 400);
    }
    
    // Get dataset information from the execution record
    const { data: executionData, error: executionError } = await supabase
      .from('dataset_executions')
      .select('dataset_id, status')
      .eq('id', executionId)
      .single();
      
    if (executionError) {
      console.error('Error fetching execution details:', executionError);
      return errorResponse(`Failed to fetch execution details: ${executionError.message}`, null, 500);
    }
    
    // Update execution status to running
    const { error: updateError } = await supabase
      .from('dataset_executions')
      .update({ 
        status: 'running',
        start_time: new Date().toISOString()
      })
      .eq('id', executionId);
      
    if (updateError) {
      console.error('Error updating execution status:', updateError);
      return errorResponse(`Failed to update execution status: ${updateError.message}`, null, 500);
    }
    
    try {
      // Mock implementation of customer acquisition timeline dataset execution
      // In a real implementation, this would call Shopify API with the credentials
      
      // Simulated data for customer acquisition timeline
      const mockData = {
        customers: [
          {
            id: 'gid://shopify/Customer/1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            createdAt: '2023-01-15T10:30:00Z',
            ordersCount: 5,
            totalSpent: 450.75
          },
          {
            id: 'gid://shopify/Customer/2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            createdAt: '2023-02-20T14:15:00Z',
            ordersCount: 3,
            totalSpent: 275.50
          },
          {
            id: 'gid://shopify/Customer/3',
            firstName: 'Robert',
            lastName: 'Johnson',
            email: 'rob.johnson@example.com',
            createdAt: '2023-03-10T09:45:00Z',
            ordersCount: 1,
            totalSpent: 125.00
          }
        ]
      };
      
      // Log success
      console.log(`Customer acquisition timeline dataset executed successfully for execution ${executionId}`);
      
      // Update execution with success result
      const { error: resultError } = await supabase
        .from('dataset_executions')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString(),
          row_count: mockData.customers.length,
          data: mockData,
          execution_time_ms: 1200 // mock execution time
        })
        .eq('id', executionId);
        
      if (resultError) {
        console.error('Error saving execution results:', resultError);
        return errorResponse(`Failed to save execution results: ${resultError.message}`, null, 500);
      }
      
      return successResponse({
        success: true,
        message: 'Dataset execution completed successfully',
        executionId,
        rowCount: mockData.customers.length
      });
      
    } catch (error) {
      console.error('Error executing dataset:', error);
      
      // Update execution with failure details
      await supabase
        .from('dataset_executions')
        .update({
          status: 'failed',
          end_time: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error during execution'
        })
        .eq('id', executionId);
        
      return errorResponse('Dataset execution failed', error, 500);
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    return errorResponse('Failed to process request', error, 400);
  }
});
