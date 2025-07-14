import { getApiUrl } from './env';
import type { SummaryProcessingUpdate } from '@/types';
import { analyzeNetworkError, createServerDownError } from './utils/networkError';

function isSummaryUpdate(value: unknown): value is SummaryProcessingUpdate {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'message' in value &&
    typeof (value as { status: unknown }).status === 'string' &&
    typeof (value as { message: unknown }).message === 'string' &&
    ['processing', 'pending', 'done', 'error'].includes((value as { status: string }).status)
  );
}

/**
 * Generator function that yields summary updates from the YouTube summary API
 */
export default async function* getVideoSummary(url: string, words: number): AsyncGenerator<SummaryProcessingUpdate> {
  const API_URL = getApiUrl();
  const eventSource = new EventSource(
    `${API_URL}/api/summary/youtube/stream?url=${encodeURIComponent(url)}&words=${words}`
  );

  try {
    while (true) {
      const update = await new Promise<SummaryProcessingUpdate>((resolve, reject) => {
        eventSource.onmessage = (event: MessageEvent<string>) => {
          try {
            const data = JSON.parse(event.data) as unknown;
            if (isSummaryUpdate(data)) {
              resolve(data);
            } else {
              reject(new Error('Invalid update format received'));
            }
          } catch (error) {
            reject(error);
          }
        };

        eventSource.onerror = (error: Event) => {
          const errorMessage = error instanceof ErrorEvent ? error.message : 'EventSource connection failed';
          reject(createServerDownError());
        };
      });

      yield update;

      if (update.status === 'done' || update.status === 'error') {
        break;
      }
    }
  } finally {
    eventSource.close();
  }
}
