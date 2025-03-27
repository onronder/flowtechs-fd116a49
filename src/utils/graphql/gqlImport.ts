
import { gql } from 'graphql-tag';
import { DocumentNode } from 'graphql';

/**
 * Loads a GraphQL query file content and parses it into a DocumentNode
 * @param content Raw GraphQL content as string
 * @returns DocumentNode that can be used with GraphQL clients
 */
export function loadGQLFile(content: string): DocumentNode {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid GraphQL content provided');
  }
  
  return gql`${content}`;
}

/**
 * Parse a GraphQL query string into a DocumentNode
 * @param queryString The raw GraphQL query string
 * @returns DocumentNode that can be used with GraphQL clients
 */
export function parseGQL(queryString: string): DocumentNode {
  return loadGQLFile(queryString);
}
