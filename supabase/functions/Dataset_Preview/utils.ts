
/**
 * Utility functions for Dataset_Preview
 */

/**
 * Parses and validates the request body
 */
export async function parseRequestBody(req: Request): Promise<any | null> {
  try {
    const text = await req.text();
    console.log("Raw request body:", text);
    
    if (!text || text.trim() === '') {
      console.error("Empty request body");
      return null;
    }
    
    try {
      const body = JSON.parse(text);
      console.log("Parsed request body:", body);
      return body;
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Error reading request body:", error);
    return null;
  }
}

/**
 * Creates a standardized timestamp for logging
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Safely parse JSON without throwing
 */
export function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
}

/**
 * Format an error for consistent logging
 */
export function formatError(error: any): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return JSON.stringify(error);
}
