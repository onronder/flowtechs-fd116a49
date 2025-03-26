
import { gql } from 'graphql-tag';

export function loadGQLFile(content: string) {
  return gql`${content}`;
}
