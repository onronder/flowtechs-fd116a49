
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
 * Load a GraphQL query file
 * This function is used to load .graphql files that have been directly imported
 * @param queryPath Path to the GraphQL file
 * @returns DocumentNode that can be used with GraphQL clients
 */
export async function loadGraphQLFile(queryPath: string): Promise<DocumentNode> {
  try {
    // Use dynamic import to load the GraphQL file
    // The queryPath should be a relative or absolute path to the .graphql file
    const rawQuery = await fetch(queryPath).then(res => res.text());
    return loadGQLFile(rawQuery);
  } catch (error) {
    console.error(`Error loading GraphQL file at ${queryPath}:`, error);
    throw new Error(`Failed to load GraphQL file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load a GraphQL query from a module
 * This function is used when importing a .graphql file that has been processed by a bundler
 * @param queryModule The imported GraphQL module
 * @returns DocumentNode that can be used with GraphQL clients
 */
export function loadGraphQLModule(queryModule: { default: string }): DocumentNode {
  if (!queryModule || !queryModule.default) {
    throw new Error('Invalid GraphQL module provided');
  }
  
  return loadGQLFile(queryModule.default);
}
