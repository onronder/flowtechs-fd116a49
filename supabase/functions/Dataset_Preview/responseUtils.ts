
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Returns a standardized error response
 * @param message Error message
 * @param status HTTP status code (default: 400)
 * @returns Response object
 */
export function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    { headers: corsHeaders, status }
  );
}

/**
 * Returns a standardized success response
 * @param data Response data
 * @param status HTTP status code (default: 200)
 * @returns Response object
 */
export function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { headers: corsHeaders, status }
  );
}
