// Shared logging utility for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Log levels
export type LogLevel = 'error' | 'warning' | 'info' | 'debug';

/**
 * Function to create a logger instance for use in Edge Functions
 */
export function createEdgeFunctionLogger(
  functionName: string,
  req?: Request,
  supabaseUrl?: string,
  supabaseKey?: string
) {
  // Get credentials from environment or parameters
  const SUPABASE_URL = supabaseUrl || Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_SERVICE_ROLE_KEY = supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  // Create anon client for logging
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Extract request info if available
  let requestInfo: any = {};
  let userId: string | undefined;
  
  if (req) {
    // Get user ID from auth header if available
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        // This is a simple extraction - in production you'd want to properly verify the JWT
        const token = authHeader.replace('Bearer ', '');
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.sub;
        }
      } catch (e) {
        // Could not extract user ID, continue without it
      }
    }
    
    // Get basic request info for logging
    requestInfo = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(
        Array.from(req.headers.entries())
          .filter(([key]) => !['authorization', 'cookie'].includes(key.toLowerCase()))
      ),
    };
  }

  /**
   * Log to console and Supabase
   */
  async function log(
    level: LogLevel,
    message: string,
    details?: Record<string, any>,
    error?: Error,
    context?: {
      sourceId?: string;
      datasetId?: string;
      executionId?: string;
      tags?: string[];
    }
  ) {
    // Always log to console
    const consoleMethod = 
      level === 'error' ? console.error :
      level === 'warning' ? console.warn :
      level === 'info' ? console.info :
      console.debug;
      
    consoleMethod(`[${functionName}] ${message}`, details || {});
    
    if (error) {
      console.error(error);
    }
    
    // Try to log to database
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('Cannot log to database: missing Supabase credentials');
        return;
      }
      
      await supabaseClient.rpc('add_log_entry', {
        p_level: level,
        p_component: functionName,
        p_message: message,
        p_details: details ? JSON.stringify(details) : null,
        p_user_id: userId,
        p_source_id: context?.sourceId,
        p_dataset_id: context?.datasetId,
        p_execution_id: context?.executionId,
        p_request_data: requestInfo ? JSON.stringify(requestInfo) : null,
        p_response_data: null, // Set in the wrapper function
        p_stack_trace: error?.stack,
        p_tags: context?.tags || ['edge-function']
      });
    } catch (dbError) {
      // Just log to console if DB logging fails
      console.error('Failed to write log to database:', dbError);
    }
  }
  
  const loggerMethods = {
    error: (message: string, details?: Record<string, any>, error?: Error, context?: any) => 
      log('error', message, details, error, context),
      
    warning: (message: string, details?: Record<string, any>, context?: any) => 
      log('warning', message, details, undefined, context),
      
    info: (message: string, details?: Record<string, any>, context?: any) => 
      log('info', message, details, undefined, context),
      
    debug: (message: string, details?: Record<string, any>, context?: any) => 
      log('debug', message, details, undefined, context),
  };
  
  // Helper to wrap a function and log any errors
  async function withErrorLogging<T>(
    fn: () => Promise<T>,
    message: string,
    context?: any
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      await loggerMethods.error(
        `${message}: ${error.message}`,
        { originalError: error.toString() },
        error,
        context
      );
      throw error;
    }
  }
  
  // Create a response handler that logs the response
  function logResponse(response: Response, context?: any) {
    const status = response.status;
    const statusText = response.statusText;
    
    if (status >= 400) {
      loggerMethods.error(
        `Response error: ${status} ${statusText}`,
        { status, statusText },
        undefined,
        context
      );
    } else {
      loggerMethods.debug(
        `Response: ${status} ${statusText}`, 
        { status, statusText },
        context
      );
    }
    
    return response;
  }
  
  return {
    ...loggerMethods,
    withErrorLogging,
    logResponse
  };
}