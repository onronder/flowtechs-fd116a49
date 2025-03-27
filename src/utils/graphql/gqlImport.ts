
import { gql } from 'graphql-tag';
import { DocumentNode } from 'graphql';

/**
 * Loads a GraphQL query file content and parses it into a DocumentNode
 * @param content Raw GraphQL content as string
 * @returns DocumentNode that can be used with GraphQL clients
 */
export function loadGQLFile(content: string): DocumentNode {
  return gql`${content}`;
}
