// API response types for the frontend
export interface AnalysisStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'error';
  totalFiles: number;
  processedFiles: number;
  totalSize: number;
  uploadCompleted: boolean;
  lambdaCompleted: boolean;
  ecsCompleted: boolean;
  bedrockCompleted: boolean;
  uploadTime?: number;
}