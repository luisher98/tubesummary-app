import { getApiUrl } from './env';
import { analyzeNetworkError } from './utils/networkError';

interface ApiResponse {
  success: boolean;
  data?: {
    id: string;
  };
}

export default async function getVideoStatus(url: string): Promise<boolean> {
  try {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/api/summary/youtube/metadata?url=${encodeURIComponent(url)}`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return false;
    }

    const { success, data } = await response.json() as ApiResponse;
    return success && Boolean(data?.id);
  } catch (error) {
    const networkError = analyzeNetworkError(error);
    console.error('Error checking video status:', networkError.technicalMessage);
    
    // If it's a server down error, throw it so the caller can handle it appropriately
    if (networkError.isServerDown) {
      throw new Error(networkError.userMessage);
    }
    
    return false;
  }
}
