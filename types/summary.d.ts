export type SummaryStatus = 'processing' | 'pending' | 'done' | 'error' | 'validating' | 'initializing' | 'uploading' | 'downloading' | 'converting' | 'transcribing' | 'segmenting' | 'summarizing' | 'finalizing';

export interface SummaryProcessingUpdate {
  status: SummaryStatus;
  message: string;
  progress?: number;
  error?: string;
  type?: string;
  timestamp?: number;
}

export interface SummaryResponse extends SummaryProcessingUpdate {
  error?: string;
  progress?: number;
} 