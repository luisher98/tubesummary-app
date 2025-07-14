import { getApiUrl } from './env';
import type { VideoInfo } from '@/types';
import { analyzeNetworkError } from './utils/networkError';

interface ApiResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    thumbnail: {
      url: string;
      width: number;
      height: number;
    };
    channel: string;
    description: string;
    duration: number;
  };
}

export default async function getInfo(url: string): Promise<VideoInfo | null> {
  try {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/api/summary/youtube/metadata?url=${encodeURIComponent(url)}`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }
    
    const { success, data } = await response.json() as ApiResponse;
    if (!success || !data) {
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      thumbnailUrl: data.thumbnail.url,
      channel: data.channel,
      description: data.description,
      duration: data.duration
    };
  } catch (error) {
    const networkError = analyzeNetworkError(error);
    console.error('Error fetching video info:', networkError.technicalMessage);
    
    // If it's a server down error, throw it so the caller can handle it appropriately
    if (networkError.isServerDown) {
      throw new Error(networkError.userMessage);
    }
    
    return null;
  }
}
