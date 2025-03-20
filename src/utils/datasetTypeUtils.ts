
/**
 * Helper functions for dataset type styling and formatting
 */

export function getDatasetTypeStyles(type: string) {
  switch (type) {
    case 'predefined':
      return { bgColor: 'bg-blue-500', color: 'text-blue-500', label: 'Predefined' };
    case 'dependent':
      return { bgColor: 'bg-purple-500', color: 'text-purple-500', label: 'Dependent' };
    case 'custom':
      return { bgColor: 'bg-amber-500', color: 'text-amber-500', label: 'Custom' };
    default:
      return { bgColor: 'bg-gray-500', color: 'text-gray-500', label: 'Unknown' };
  }
}
