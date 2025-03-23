
/**
 * Utility functions for SQL operations
 */

/**
 * Safely escape a string value to prevent SQL injection
 * This is a simple implementation - for production, use parameterized queries
 */
export function escapeSqlString(value: string): string {
  if (!value) return '';
  
  // Replace single quotes with double single quotes (SQL standard for escaping)
  return value.replace(/'/g, "''");
}

/**
 * Safely build a SQL query with proper escaping
 */
export function buildSafeQuery(template: string, params: Record<string, any>): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, key) => {
    const value = params[key];
    
    if (value === undefined || value === null) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      return `'${escapeSqlString(value)}'`;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    
    if (Array.isArray(value)) {
      return value.map(item => 
        typeof item === 'string' 
          ? `'${escapeSqlString(item)}'` 
          : item
      ).join(', ');
    }
    
    return '';
  });
}
