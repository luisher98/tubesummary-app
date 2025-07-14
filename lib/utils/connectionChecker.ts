import { getApiUrl } from '../env';
import { analyzeNetworkError, createServerDownError } from './networkError';

/**
 * Connection status interface
 */
export interface ConnectionStatus {
  isConnected: boolean;
  latency?: number;
  error?: string;
  timestamp: number;
}

/**
 * Checks if the backend server is running and reachable
 * Uses the health endpoint with a short timeout
 */
export async function checkBackendConnection(timeoutMs = 5000): Promise<ConnectionStatus> {
  const startTime = Date.now();
  const API_URL = getApiUrl();
  
  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return {
        isConnected: true,
        latency,
        timestamp: Date.now(),
      };
    } else {
      return {
        isConnected: false,
        error: `Server returned ${response.status}: ${response.statusText}`,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    const networkError = analyzeNetworkError(error);
    
    return {
      isConnected: false,
      error: networkError.userMessage,
      timestamp: Date.now(),
    };
  }
}

/**
 * Performs a quick connection check with a very short timeout
 * Useful for validating connection before making API calls
 */
export async function quickConnectionCheck(): Promise<boolean> {
  try {
    const status = await checkBackendConnection(2000);
    return status.isConnected;
  } catch {
    return false;
  }
}

/**
 * Validates connection before making an API call
 * Throws a user-friendly error if the backend is not reachable
 */
export async function validateConnection(): Promise<void> {
  const isConnected = await quickConnectionCheck();
  
  if (!isConnected) {
    throw createServerDownError();
  }
}

/**
 * Creates a wrapper for fetch that includes connection validation
 */
export async function fetchWithConnectionCheck(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Quick connection check first
  const isConnected = await quickConnectionCheck();
  
  if (!isConnected) {
    throw createServerDownError();
  }
  
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    const networkError = analyzeNetworkError(error);
    
    if (networkError.isServerDown || networkError.isNetworkError) {
      throw createServerDownError();
    }
    
    throw error;
  }
} 