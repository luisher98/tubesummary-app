import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-utils';
import { getApiUrl, getMaxFileSize } from '@/lib/env';

interface ErrorResponse {
  message: string;
  status: number;
}

interface UploadUrlResponse {
  url: string;
  fileId: string;
  blobName: string;
}

interface UploadUrlRequest {
  fileName: string;
  fileSize: number;
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function handleUploadUrlRequest(request: NextRequest, params: { fileName: string; fileSize: number }) {
  const { fileName, fileSize } = params;

  const maxFileSize = getMaxFileSize();
  if (fileSize > maxFileSize) {
    return createErrorResponse({
      message: `File size exceeds maximum allowed size of ${maxFileSize / (1024 * 1024)}MB`,
      status: 400
    });
  }

  const API_URL = getApiUrl();
  console.log('Calling backend API:', `${API_URL}/api/storage/azure/upload/initiate`);
  
  try {
    const response = await fetch(`${API_URL}/api/storage/azure/upload/initiate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileSize,
      }),
    });
    
    // Log the response for debugging
    const responseText = await response.text();
    console.log('Backend response:', responseText);
    
    if (!response.ok) {
      try {
        const error = JSON.parse(responseText) as ErrorResponse;
        return createErrorResponse({
          message: error.message ?? 'Failed to get upload URL',
          status: response.status
        });
      } catch (parseError) {
        return createErrorResponse({
          message: `Backend error: ${responseText}`,
          status: response.status
        });
      }
    }

    try {
      const data = JSON.parse(responseText) as UploadUrlResponse;
      return createSuccessResponse(data);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      return createErrorResponse({
        message: 'Invalid JSON response from backend',
        status: 500
      });
    }
  } catch (fetchError) {
    console.error('Fetch error:', fetchError);
    return createErrorResponse({
      message: 'Failed to connect to backend service',
      status: 503
    });
  }
}

/**
 * GET /api/azure/upload/url
 */
export async function GET(request: NextRequest) {
  try {
    const fileName = request.nextUrl.searchParams.get('fileName');
    const fileSizeStr = request.nextUrl.searchParams.get('fileSize');

    if (!fileName || !fileSizeStr) {
      return createErrorResponse({
        message: 'fileName and fileSize parameters are required',
        status: 400
      });
    }

    const fileSize = parseInt(fileSizeStr, 10);
    if (isNaN(fileSize) || fileSize <= 0) {
      return createErrorResponse({
        message: 'Invalid file size',
        status: 400
      });
    }

    return handleUploadUrlRequest(request, { fileName, fileSize });
  } catch (error) {
    console.error('Error in GET /api/azure/upload/url:', error);
    return createErrorResponse({
      message: 'Internal server error',
      status: 500
    });
  }
}

/**
 * POST /api/azure/upload/url
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UploadUrlRequest;
    const { fileName, fileSize } = body;

    if (!fileName || !fileSize) {
      return createErrorResponse({
        message: 'fileName and fileSize are required in request body',
        status: 400
      });
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return createErrorResponse({
        message: 'Invalid file size',
        status: 400
      });
    }

    return handleUploadUrlRequest(request, { fileName, fileSize });
  } catch (error) {
    console.error('Error in POST /api/azure/upload/url:', error);
    return createErrorResponse({
      message: 'Internal server error',
      status: 500
    });
  }
} 