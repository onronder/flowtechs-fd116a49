
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
    
    const body = JSON.parse(text);
    console.log("Parsed request body:", body);
    return body;
  } catch (error) {
    console.error("Error parsing request body:", error);
    return null;
  }
}

/**
 * Creates a standardized timestamp for logging
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}
