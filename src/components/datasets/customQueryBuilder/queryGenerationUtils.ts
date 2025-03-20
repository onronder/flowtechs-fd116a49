
/**
 * Generates a GraphQL query based on the selected resource and fields
 */
export function generateGraphQLQuery(
  selectedResource: any,
  selectedFields: string[]
): string {
  if (!selectedResource || selectedFields.length === 0) {
    return "";
  }

  // Generate resource name (collection name)
  const resourceName = selectedResource.name.endsWith('Connection')
    ? selectedResource.name.replace('Connection', 's').toLowerCase()
    : `${selectedResource.name.toLowerCase()}s`;

  // Process field selections
  const fieldSelections = selectedFields.map(field => {
    // Handle nested fields (dot notation in our selection)
    if (field.includes('.')) {
      const parts = field.split('.');
      let result = parts[parts.length - 1];
      
      // Work backwards to create nested selection
      for (let i = parts.length - 2; i >= 0; i--) {
        result = `${parts[i]} { ${result} }`;
      }
      return result;
    }
    return field;
  }).join('\n      ');

  // Create the complete query
  return `query {
  ${resourceName}(first: 10) {
    edges {
      node {
        ${fieldSelections}
      }
    }
  }
}`;
}
