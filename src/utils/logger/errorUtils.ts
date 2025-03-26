
/**
 * Error and stack trace utility functions
 */

/**
 * Get stack trace for error logging
 */
export function getStackTrace(error?: Error): string {
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
 * Error boundary for async functions - logs errors and returns null
 * @param fn Async function to execute with error boundary
 * @param component Component name for logging
 * @param message Error message prefix
 * @param logError Function to log the error
 * @param context Additional context for error logs
 */
export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  component: string,
  message: string,
  logError: (component: string, message: string, details?: Record<string, any>, error?: Error, context?: any) => Promise<any>,
  context?: any
): Promise<T | null> {
  try {
    return await fn();
  } catch (error: any) {
    await logError(
      component,
      `${message}: ${error.message}`,
      { originalError: error.toString() },
      error,
      context
    );
    return null;
  }
}
