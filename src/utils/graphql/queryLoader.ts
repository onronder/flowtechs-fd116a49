
import { DocumentNode } from 'graphql';
import { gql } from 'graphql-tag';

/**
 * Parse a GraphQL query string into a DocumentNode
 * @param queryString The raw GraphQL query string
 * @returns DocumentNode that can be used with GraphQL clients
 */
export function parseGql(queryString: string): DocumentNode {
  return gql`${queryString}`;
}

/**
 * Load a GraphQL query file directly
 * @param queryPath Path to the GraphQL file
 * @returns DocumentNode that can be used with GraphQL clients
 */
export async function loadGraphQLFile(queryPath: string): Promise<DocumentNode> {
  try {
    const queryModule = await import(/* @vite-ignore */ queryPath);
    return queryModule.default;
  } catch (error) {
    console.error(`Error loading GraphQL file at ${queryPath}:`, error);
    throw new Error(`Failed to load GraphQL file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
