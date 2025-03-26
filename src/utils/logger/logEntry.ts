
import { LogLevel } from './logLevels';
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Handles console output for a log entry
 */
export function logToConsole(entry: LogEntry): void {
  const { level, component, message, details, function: functionName, stackTrace, requestData, responseData, userId, sourceId, datasetId, executionId, tags } = entry;
  
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

/**
 * Saves a log entry to the database
 */
export async function logToDatabase(entry: LogEntry): Promise<string | null> {
  try {
    const { level, component, message, details, function: functionName, userId, sourceId, datasetId, executionId, requestData, responseData, stackTrace, tags } = entry;
    
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
