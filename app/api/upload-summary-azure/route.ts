import { NextRequest } from 'next/server';
import { createErrorResponse } from '@/lib/api-utils';
import { getApiUrl } from '@/lib/env';
import { streamingJsonResponse } from '@/lib/streaming';

interface UploadSummaryRequest {
  blobName: string;
  fileId: string;
  words?: number;
}

interface ErrorResponse {
  message: string;
  status: number;
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/upload-summary-azure
 * 
 * Generates a summary from a video file that was uploaded to Azure Blob Storage.
 * Uses Server-Sent Events (SSE) to stream progress and summary updates.
 * 
 * @param request - The incoming request object containing:
 *   - blobName: The name of the blob in Azure storage
 *   - fileId: The unique ID of the file
 *   - words: Target word count for the summary
 * 
 * @returns 
 * - 200: SSE stream with summary updates
 * - 400: Bad request (missing parameters)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { blobName, fileId, words } = await request.json() as UploadSummaryRequest;

    if (!blobName || !fileId) {
      return createErrorResponse({
        message: 'blobName and fileId are required',
        status: 400
      });
    }

    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/api/summary/upload/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blobName,
        fileId,
        words: words ?? 400,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      return createErrorResponse({
        message: error.message ?? 'Failed to process video',
        status: response.status
      });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get reader from response body');
    }

    return streamingJsonResponse(async function* () {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          const decodedValue = new TextDecoder().decode(value);
          yield decodedValue;
        }
      }
    });
  } catch (error) {
    console.error('Error in /api/upload-summary-azure:', error);
    return createErrorResponse({
      message: 'Internal server error',
      status: 500
    });
  }
} 