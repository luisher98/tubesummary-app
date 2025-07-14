import { getApiUrl } from './env';

interface ApiErrorResponse {
  error?: {
    message?: string;
    error?: string;
  };
}

interface UploadUrlResponse {
  data?: {
    url: string;
    fileId: string;
    blobName: string;
  };
}

/**
 * Get a SAS URL for uploading a file directly to Azure Blob Storage
 */
export async function getUploadUrl(fileName: string, fileSize: number): Promise<UploadUrlResponse> {
  const API_URL = getApiUrl();
  const response = await fetch(`${API_URL}/api/storage/azure/upload/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      fileSize,
    }),
  });

  const data = await response.json() as UploadUrlResponse & ApiErrorResponse;

  if (!response.ok || data.error) {
    const errorMessage = data.error?.message ?? data.error?.error ?? 'Failed to get upload URL';
    throw new Error(errorMessage);
  }

  return data;
} 