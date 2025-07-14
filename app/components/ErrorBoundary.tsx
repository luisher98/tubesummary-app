'use client';

import { type ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { analyzeNetworkError } from '@/lib/utils/networkError';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({ children, fallback }: Props) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      console.error('Caught in Error Boundary:', event.error);
      if (event.error instanceof Error) {
        setError(event.error);
      } else {
        setError(new Error('An unexpected error occurred'));
      }
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (error) {
    const networkError = analyzeNetworkError(error);
    
    return (
      <div 
        role="alert" 
        aria-live="assertive"
        className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/10 dark:text-red-400"
      >
        <h2 className="mb-2 font-semibold">Something went wrong</h2>
        <p className="text-red-700 dark:text-red-300">
          {networkError.userMessage}
        </p>
        {networkError.isServerDown && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Tip: Make sure the backend server is running on the configured port.
          </p>
        )}
        {fallback}
      </div>
    );
  }

  return children;
} 