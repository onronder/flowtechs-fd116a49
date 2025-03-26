
/**
 * Log level definitions for the FlowTechs logging system
 */

// Log levels
export type LogLevel = 'error' | 'warning' | 'info' | 'debug';

// Log level priority map
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warning: 1,
  info: 2,
  debug: 3
};

// Default log settings
export const LOG_CONFIG = {
  minLevel: process.env.NODE_ENV === 'production' ? 'warning' : 'debug',
  consoleEnabled: true,
  databaseEnabled: true,
};

/**
 * Check if a log level should be processed based on minimum level setting
 */
export function shouldProcessLogLevel(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[LOG_CONFIG.minLevel as LogLevel];
}
