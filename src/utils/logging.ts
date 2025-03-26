
/**
 * Comprehensive logging system for FlowTechs
 * Handles console logs and also logs to the Dev_Logs table in Supabase
 */
import { supabase } from "@/integrations/supabase/client";

// Log levels
export type LogLevel = 'error' | 'warning' | 'info' | 'debug';

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  component: string;
  message: string;
  details?: Record<string, any>;
  function?: string;
  userId?: string;
  sourceId?: string;
  datasetId?: string;
  executionId?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  stackTrace?: string;
  tags?: string[];
}

// Default log settings
const LOG_CONFIG = {
  minLevel: process.env.NODE_ENV === 'production' ? 'warning' : 'debug',
  consoleEnabled: true,
  databaseEnabled: true,
};

// Log level priority map
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warning: 1,
  info: 2,
  debug: 3
};

/**
 * Main logger function
 * @param entry The log entry to record
 * @returns Promise with the log ID if saved to database
 */
export async function logEntry(entry: LogEntry): Promise<string | null> {
  const { level, component, message, details, function: functionName, userId, sourceId, datasetId, executionId, requestData, responseData, stackTrace, tags } = entry;
  
  // Skip if below minimum log level
  if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[LOG_CONFIG.minLevel as LogLevel]) {
    return null;
  }
  
  // Log to console if enabled
  if (LOG_CONFIG.consoleEnabled) {
    const consoleMethod = level === 'error' ? console.error :
                          level === 'warning' ? console.warn :
                          level === 'info' ? console.info :
                          console.debug;
                          
    const formattedMessage = `[${component}${functionName ? `::${functionName}` : ''}] ${message}`;
    
    if (details || requestData || responseData) {
      consoleMethod(formattedMessage, {
        details,
        requestData,
        responseData,
        userId,
        sourceId,
        datasetId,
        executionId,
        tags
      });
    } else {
      consoleMethod(formattedMessage);
    }
    
    if (stackTrace && level === 'error') {
      console.error(stackTrace);
    }
  }
  
  // Log to database if enabled
  if (LOG_CONFIG.databaseEnabled) {
    try {
      // Since add_log_entry RPC is not in the typed functions list,
      // we need to use a more generic approach with type assertion
      const response = await supabase.rpc(
        'add_log_entry' as any, 
        {
          p_level: level,
          p_component: component,
          p_message: message,
          p_details: details ? JSON.stringify(details) : null,
          p_function: functionName,
          p_user_id: userId,
          p_source_id: sourceId,
          p_dataset_id: datasetId,
          p_execution_id: executionId,
          p_request_data: requestData ? JSON.stringify(requestData) : null,
          p_response_data: responseData ? JSON.stringify(responseData) : null,
          p_stack_trace: stackTrace,
          p_tags: tags
        }
      );
      
      const { data, error } = response as unknown as { 
        data: string | null, 
        error: { message: string } | null 
      };
      
      if (error) {
        console.error("Failed to save log to database:", error);
        return null;
      }
      
      return data ? String(data) : null;
    } catch (err) {
      // Don't retry or it might cause an infinite loop
      console.error("Exception saving log to database:", err);
      return null;
    }
  }
  
  return null;
}

/**
 * Get stack trace for error logging
 */
function getStackTrace(error?: Error): string {
  if (error && error.stack) {
    return error.stack;
  }
  
  try {
    throw new Error('Stack trace');
  } catch (err: any) {
    const stack = err.stack || '';
    // Remove the first two lines which are this function and the throw statement
    return stack.split('\n').slice(2).join('\n');
  }
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  error(component: string, message: string, details?: Record<string, any>, error?: Error, context?: Partial<Omit<LogEntry, 'level' | 'component' | 'message' | 'details'>>) {
    return logEntry({
      level: 'error',
      component,
      message,
      details,
      stackTrace: error ? getStackTrace(error) : undefined,
      ...context
    });
  },
  
  warning(component: string, message: string, details?: Record<string, any>, context?: Partial<Omit<LogEntry, 'level' | 'component' | 'message' | 'details'>>) {
    return logEntry({
      level: 'warning',
      component,
      message,
      details,
      ...context
    });
  },
  
  info(component: string, message: string, details?: Record<string, any>, context?: Partial<Omit<LogEntry, 'level' | 'component' | 'message' | 'details'>>) {
    return logEntry({
      level: 'info',
      component,
      message,
      details,
      ...context
    });
  },
  
  debug(component: string, message: string, details?: Record<string, any>, context?: Partial<Omit<LogEntry, 'level' | 'component' | 'message' | 'details'>>) {
    return logEntry({
      level: 'debug',
      component,
      message,
      details,
      ...context
    });
  },
  
  /**
   * Log API request and response
   */
  apiRequest(component: string, endpoint: string, requestData?: any, responseData?: any, error?: Error, context?: Partial<Omit<LogEntry, 'level' | 'component' | 'message' | 'details'>>) {
    const level = error ? 'error' : 'debug';
    const message = error 
      ? `API Error: ${endpoint}` 
      : `API Request: ${endpoint}`;
      
    return logEntry({
      level,
      component,
      message,
      details: error ? { error: error.message } : undefined,
      requestData,
      responseData,
      stackTrace: error ? getStackTrace(error) : undefined,
      tags: ['api-request'],
      ...context
    });
  },
  
  /**
   * Log dataset execution
   */
  datasetExecution(component: string, message: string, datasetId: string, executionId: string, details?: Record<string, any>, error?: Error) {
    const level = error ? 'error' : 'info';
    
    return logEntry({
      level,
      component,
      message,
      details,
      datasetId,
      executionId,
      stackTrace: error ? getStackTrace(error) : undefined,
      tags: ['dataset-execution']
    });
  }
};

/**
 * Error boundary for async functions - logs errors and returns null
 * @param fn Async function to execute with error boundary
 * @param component Component name for logging
 * @param message Error message prefix
 * @param context Additional context for error logs
 */
export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  component: string,
  message: string,
  context?: Partial<Omit<LogEntry, 'level' | 'component' | 'message' | 'details'>>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error: any) {
    await logger.error(
      component,
      `${message}: ${error.message}`,
      { originalError: error.toString() },
      error,
      context
    );
    return null;
  }
}
