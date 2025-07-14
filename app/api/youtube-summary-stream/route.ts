import { streamingJsonResponse } from "@/app/server/streaming";
import { delay } from "@/app/utils/utils";
import { youtubeUrlSchema, wordCountSchema } from '@/lib/validations/youtube';
import { createErrorResponse } from '@/lib/api-utils';
import type { NextRequest } from 'next/server';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    title: string;
    duration: number;
    thumbnailUrl: string;
  };
}

interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

interface VideoInfoResponse {
  success: true;
  data: {
    title: string;
    duration: number;
    thumbnailUrl: string;
  };
}

/**
 * Configuration for the API route
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
 */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

/**
 * Helper function that fetches and streams summary updates from the backend API
 * 
 * @param url - The YouTube video URL to summarize
 * @param words - The target number of words for the summary
 * @param throttleMs - Delay between updates in milliseconds to control streaming rate
 * @yields String chunks of the summary as they become available
 * @throws {Error} If the reader cannot be obtained from response body
 */
async function* fetchSummaryUpdates(
  url: string,
  words: number,
  throttleMs: number,
): AsyncGenerator<string, void, unknown> {
  const API_URL = process.env.API_URL ?? "http://localhost:5050";

  // First, verify the video info
  try {
    console.log('Fetching video info from:', `${API_URL}/api/summary/youtube/metadata?url=${encodeURIComponent(url)}`);
    
    const infoResponse = await fetch(
      `${API_URL}/api/summary/youtube/metadata?url=${encodeURIComponent(url)}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    const infoData = await infoResponse.json() as ApiResponse;
    console.log('Video info response:', infoData);

    if (!infoResponse.ok || !infoData.success) {
      const errorMessage = infoData.message ?? infoData.error ?? 'Failed to fetch video info';
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Video info error:', error);
    throw new Error(`Failed to fetch video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Then proceed with the summary generation
  try {
    console.log('Fetching summary from:', `${API_URL}/api/summary/youtube/stream?url=${encodeURIComponent(url)}&words=${words}`);
    
    const response = await fetch(
      `${API_URL}/api/summary/youtube/stream?url=${encodeURIComponent(url)}&words=${words}`,
      {
        headers: {
          'Accept': 'text/event-stream',
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as ApiResponse;
      const errorMessage = errorData.message ?? errorData.error ?? `API request failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get reader from response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const decodedValue = new TextDecoder().decode(value);
        yield decodedValue;
        await delay(throttleMs); // Throttle the updates
      }
    }
  } catch (error) {
    console.error('Summary generation error:', error);
    throw error;
  }
}

/**
 * GET /api/youtube-summary-sse
 * 
 * Streams a YouTube video summary from the backend API using Server-Sent Events (SSE).
 * The summary is throttled to ensure smooth delivery to the client.
 * 
 * @param request - The incoming request object containing:
 *   - url: YouTube video URL
 *   - wordCount: Target word count for the summary
 * 
 * @returns 
 * - 200: SSE stream with throttled summary updates
 * - 400: Bad request (invalid URL or word count)
 * - 500: Internal server error
 * 
 * @example
 * // Request
 * GET /api/youtube-summary-sse?url=https://www.youtube.com/watch?v=VIDEO_ID&wordCount=200
 * 
 * // SSE Response Events
 * data: {
 *   "type": "start",
 *   "message": "Starting summary generation..."
 * }
 * 
 * data: {
 *   "type": "progress",
 *   "message": "Analyzing video content..."
 * }
 * 
 * data: {
 *   "type": "summary",
 *   "message": "First part of the summary..."
 * }
 * 
 * data: {
 *   "type": "complete",
 *   "message": "Summary generation complete"
 * }
 * 
 * @throws {Error} If the client doesn't support SSE
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    const wordCount = request.nextUrl.searchParams.get('wordCount');

    if (!url) {
      return createErrorResponse({
        message: 'URL parameter is required',
        status: 400
      });
    }

    if (!wordCount) {
      return createErrorResponse({
        message: 'Word count parameter is required',
        status: 400
      });
    }

    // Validate YouTube URL
    const urlResult = youtubeUrlSchema.safeParse(url);
    if (!urlResult.success) {
      return createErrorResponse({
        message: urlResult.error?.errors[0]?.message ?? 'Invalid YouTube URL',
        status: 400
      });
    }

    // Validate word count
    const wordResult = wordCountSchema.safeParse(parseInt(wordCount, 10));
    if (!wordResult.success) {
      return createErrorResponse({
        message: wordResult.error?.errors[0]?.message ?? 'Invalid word count',
        status: 400
      });
    }

    // Return streaming response
    return streamingJsonResponse(
      fetchSummaryUpdates(urlResult.data, wordResult.data, 500)
    );
  } catch (error) {
    console.error('Error in /api/youtube-summary-sse:', error);
    return createErrorResponse({
      message: error instanceof Error ? error.message : 'Internal server error',
      status: 500
    });
  }
} 