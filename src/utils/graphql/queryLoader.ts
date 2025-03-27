
import { DocumentNode } from 'graphql';
import { loadGQLFile } from './gqlImport';

/**
 * Parse a GraphQL query string into a DocumentNode
 * @param queryString The raw GraphQL query string
 * @returns DocumentNode that can be used with GraphQL clients
 */
export function parseGql(queryString: string): DocumentNode {
  return loadGQLFile(queryString);
}

/**
 * Load a GraphQL query from a file path
 * @param queryPath Path to the GraphQL file
 * @returns Promise resolving to DocumentNode that can be used with GraphQL clients
 */
export async function loadGraphQLFile(queryPath: string): Promise<DocumentNode> {
  try {
    const response = await fetch(queryPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch GraphQL file: ${response.statusText}`);
    }
    const queryString = await response.text();
    return parseGql(queryString);
  } catch (error) {
    console.error(`Error loading GraphQL file at ${queryPath}:`, error);
    throw new Error(`Failed to load GraphQL file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load a GraphQL query from a module
 * @param queryModule The imported GraphQL module
 * @returns DocumentNode that can be used with GraphQL clients
 */
export function loadGraphQLModule(queryModule: { default: string }): DocumentNode {
  if (!queryModule || !queryModule.default) {
    throw new Error('Invalid GraphQL module provided');
  }
  
  return loadGQLFile(queryModule.default);
}
