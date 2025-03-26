
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
 * This function is exported for backward compatibility but the main implementation
 * is now in the index.ts file to avoid circular dependencies
 */
export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  component: string,
  message: string,
  logError: (component: string, message: string, details?: Record<string, any>, error?: Error) => Promise<any>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error: any) {
    await logError(
      component,
      `${message}: ${error.message}`,
      { originalError: error.toString() },
      error
    );
    return null;
  }
}
