
/**
 * Merge results based on strategy
 */
export function mergeResults(
  primaryResults: any[],
  secondaryResults: any[],
  mergeStrategy: string
) {
  switch (mergeStrategy) {
    case 'nested':
      // Add secondary results as a nested property on primary results
      return primaryResults.map(primary => ({
        ...primary,
        secondaryData: secondaryResults.filter(
          secondary => primary.id === secondary.primaryId
        )
      }));
      
    case 'flat':
      // Create new objects combining primary and secondary data
      return primaryResults.flatMap(primary => {
        const related = secondaryResults.filter(
          secondary => primary.id === secondary.primaryId
        );
        
        if (related.length === 0) {
          return [{ ...primary, hasSecondaryData: false }];
        }
        
        return related.map(secondary => ({
          ...primary,
          ...secondary,
          hasSecondaryData: true
        }));
      });
      
    case 'reference':
    default:
      // Just return primary results with IDs that can be used to lookup secondary data
      return primaryResults;
  }
}
