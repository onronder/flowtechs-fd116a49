
import { exportDataset as exportDatasetFn, getDatasetExports as getDatasetExportsFn } from "@/api/datasets/exportApi";

/**
 * Export dataset
 * @deprecated Use exportDataset from "@/api/datasets/exportApi" instead
 */
export async function exportDataset(executionId: string, options = { format: 'json' as const }) {
  return exportDatasetFn({
    executionId,
    format: options.format
  });
}

/**
 * Get dataset exports
 * @deprecated Use getDatasetExports from "@/api/datasets/exportApi" instead
 */
export async function getDatasetExports(executionId: string) {
  return getDatasetExportsFn(executionId);
}
