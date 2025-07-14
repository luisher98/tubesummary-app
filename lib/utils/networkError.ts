/**
 * Network error detection utilities
 */

export interface NetworkErrorInfo {
  isNetworkError: boolean;
  isServerDown: boolean;
  userMessage: string;
  technicalMessage: string;
}

/**
 * Detects if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // TypeError is typically thrown for network issues like CORS, connection refused, etc.
    return error.message.includes('fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('Failed to fetch');
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('connection') ||
           message.includes('refused') ||
           message.includes('timeout') ||
           message.includes('cors') ||
           message.includes('fetch');
  }
  
  return false;
}

/**
 * Detects if the backend server is likely not running
 */
export function isServerDownError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError');
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('connection refused') ||
           message.includes('econnrefused') ||
           message.includes('failed to connect') ||
           message.includes('server not running');
  }
  
  return false;
}

/**
 * Analyzes an error and provides detailed information about network issues
 */
export function analyzeNetworkError(error: unknown): NetworkErrorInfo {
  const isNetwork = isNetworkError(error);
  const isServerDown = isServerDownError(error);
  
  let userMessage = 'An unexpected error occurred. Please try again.';
  let technicalMessage = 'Unknown error';
  
  if (error instanceof Error) {
    technicalMessage = error.message;
  }
  
  if (isServerDown) {
    userMessage = 'Unable to connect to the server. Please make sure the backend server is running and try again.';
  } else if (isNetwork) {
    userMessage = 'Network error. Please check your internet connection and try again.';
  } else if (error instanceof Error) {
    userMessage = error.message;
  }
  
  return {
    isNetworkError: isNetwork,
    isServerDown,
    userMessage,
    technicalMessage
  };
}

/**
 * Creates a standardized error for server connection issues
 */
export function createServerDownError(): Error {
  const error = new Error('Unable to connect to the server. Please make sure the backend server is running.');
  error.name = 'ServerDownError';
  return error;
}

/**
 * Creates a standardized error for network issues
 */
export function createNetworkError(originalError?: unknown): Error {
  const error = new Error('Network error. Please check your connection and try again.');
  error.name = 'NetworkError';
  if (originalError instanceof Error) {
    error.cause = originalError;
  }
  return error;
} 