
import { supabase } from "@/integrations/supabase/client";

interface PreviewOptions {
  limit?: number;
  retryCount?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Fetch dataset preview with enhanced error handling, debugging, and retry capabilities
 */
export async function fetchDatasetPreview(
  executionId: string, 
  options: PreviewOptions = {}
) {
  const { 
    limit = 100,
    retryCount = 0,
    maxRetries = 3,
    retryDelay = 1000
  } = options;
  
  try {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }
    
    console.log(`Sending preview request for execution ID: ${executionId}`);
    
    // Explicitly stringify the payload
    const payload = JSON.stringify({ executionId, limit }); 
    console.log("Sending preview request with payload:", payload);
    
    // Use direct fetch for more control over the request
    console.time('preview_request');
    
    // Get the current auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    if (!token) {
      throw new Error("Authentication required to fetch preview");
    }
    
    const response = await fetch("https://sxzgeevxciuxjyxfartx.supabase.co/functions/v1/Dataset_Preview", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload
    });
    
    console.timeEnd('preview_request');
    
    // Handle different HTTP error scenarios
    if (response.status === 429 && retryCount < maxRetries) {
      // Rate limiting - implement exponential backoff
      console.log(`Rate limited. Retry ${retryCount + 1}/${maxRetries} after ${retryDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetchDatasetPreview(executionId, {
        limit,
        retryCount: retryCount + 1,
        maxRetries,
        retryDelay: retryDelay * 2
      });
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error("Error response details:", errorData);
      } catch (parseError) {
        const errorText = await response.text();
        console.error("Error response (text):", errorText);
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(`Preview error (${response.status}): ${errorMessage}`);
    }
    
    const responseText = await response.text();
    
    // Handle empty responses
    if (!responseText) {
      console.error("Empty response from preview function");
      throw new Error("Empty response from preview function");
    }
    
    // Try to parse the response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError, "Response text:", responseText);
      throw new Error(`Invalid JSON response: ${jsonError.message}`);
    }
    
    if (!data) {
      console.error("No data returned from preview function");
      throw new Error("No data returned from preview function");
    }
    
    // Log the response structure to help diagnose issues
    console.log("Dataset preview response received:", data);
    console.log("Dataset preview status:", data.status);
    
    if (data.status === "failed" && data.error) {
      console.error("Execution failed:", data.error);
      throw new Error(`Execution failed: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching dataset preview:", error);
    
    // Enhance error with more details
    const enhancedError = error instanceof Error 
      ? new Error(`Preview fetch failed: ${error.message}`)
      : new Error(`Preview fetch failed: ${JSON.stringify(error)}`);
      
    throw enhancedError;
  }
}
