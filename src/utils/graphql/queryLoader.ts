
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
