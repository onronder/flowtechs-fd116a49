
/**
 * Comprehensive logging system for FlowTechs
 * Handles console logs and also logs to the Dev_Logs table in Supabase
 */
import { LogLevel, shouldProcessLogLevel } from './logLevels';
import { LogEntry, logToConsole, logToDatabase } from './logEntry';
import { getStackTrace, withErrorBoundary } from './errorUtils';

/**
 * Main logger function
 * @param entry The log entry to record
 * @returns Promise with the log ID if saved to database
 */
export async function logEntry(entry: LogEntry): Promise<string | null> {
  // Skip if below minimum log level
  if (!shouldProcessLogLevel(entry.level)) {
    return null;
  }
  
  // Log to console
  logToConsole(entry);
  
  // Log to database
  return logToDatabase(entry);
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
 * Re-export the withErrorBoundary function with logger.error as the default error handler
 */
export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  component: string,
  message: string,
  context?: Partial<Omit<LogEntry, 'level' | 'component' | 'message' | 'details'>>
): Promise<T | null> {
  return errorUtils.withErrorBoundary(fn, component, message, logger.error, context);
}

// Re-export for backward compatibility
export type { LogLevel, LogEntry };
export { getStackTrace } from './errorUtils';

// Export a complete errorUtils object for direct imports
export const errorUtils = {
  getStackTrace,
  withErrorBoundary: (
    fn: () => Promise<any>, 
    component: string, 
    message: string, 
    logError = logger.error,
    context?: any
  ) => withErrorBoundary(fn, component, message, logError, context)
};
