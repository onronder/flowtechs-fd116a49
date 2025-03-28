
export type DatasetType = 'predefined' | 'dependent' | 'custom' | 'direct_api';

export interface DatasetExecutionResult {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rowCount?: number;
  executionTime?: number;
}

export interface ExecutionResultParams {
  datasetId: string;
  executionId: string;
  result: any;
  rowCount: number;
  executionTime: number;
  status: 'completed' | 'failed';
}

export interface DatasetResolution {
  dataset: any;
  userId: string;
  type: DatasetType;
  shopifyToken: string;
  shop: string;
  queryTemplate?: string;
  primaryQuery?: string;
  secondaryQuery?: string;
  idPath?: string;
}
